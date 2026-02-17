package fs

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

var (
	ErrPathRequired            = errors.New("path is required")
	ErrInvalidPath             = errors.New("invalid path")
	ErrPathNotFound            = errors.New("path does not exist")
	ErrPathIsDirectory         = errors.New("path is a directory")
	ErrPathNotDirectory        = errors.New("path is not a directory")
	ErrDirectoryNeedsRecursive = errors.New("directory delete requires recursive=true")
	ErrFileTooLarge            = errors.New("file too large")
	ErrContentTooLarge         = errors.New("content too large")
	ErrBinaryFile              = errors.New("binary files are not supported")
	ErrUnsupportedFileType     = errors.New("unsupported file type")
	ErrRefuseFilesystemRoot    = errors.New("refusing to mutate filesystem root")
	ErrFileAlreadyExists       = errors.New("file already exists")
	ErrNoWorkspacePaths        = errors.New("no paths provided")
	ErrTooManyWorkspacePaths   = errors.New("too many paths provided")
)

const (
	defaultMaxReadFileBytes     = 5 * 1024 * 1024 // 5 MiB
	defaultMaxWriteFileBytes    = 5 * 1024 * 1024 // 5 MiB
	defaultMaxListEntries       = 2_000
	defaultMaxWorkspaceOpenPath = 128
	dirReadBatchSize            = 256
)

type Config struct {
	MaxReadFileBytes     int64
	MaxWriteFileBytes    int64
	MaxListEntries       int
	MaxWorkspaceOpenPath int
}

func DefaultConfig() Config {
	return Config{
		MaxReadFileBytes:     defaultMaxReadFileBytes,
		MaxWriteFileBytes:    defaultMaxWriteFileBytes,
		MaxListEntries:       defaultMaxListEntries,
		MaxWorkspaceOpenPath: defaultMaxWorkspaceOpenPath,
	}
}

type Service struct {
	cfg Config
}

func NewService(cfg Config) *Service {
	if cfg.MaxReadFileBytes <= 0 {
		cfg.MaxReadFileBytes = defaultMaxReadFileBytes
	}
	if cfg.MaxWriteFileBytes <= 0 {
		cfg.MaxWriteFileBytes = defaultMaxWriteFileBytes
	}
	if cfg.MaxListEntries <= 0 {
		cfg.MaxListEntries = defaultMaxListEntries
	}
	if cfg.MaxWorkspaceOpenPath <= 0 {
		cfg.MaxWorkspaceOpenPath = defaultMaxWorkspaceOpenPath
	}

	return &Service{cfg: cfg}
}

type StatResult struct {
	Path    string
	Exists  bool
	Size    int64
	IsDir   bool
	ModTime time.Time
}

type ListEntry struct {
	Name  string
	Path  string
	IsDir bool
	Size  int64
}

type ReadResult struct {
	Path    string
	Size    int64
	Content string
}

func (s *Service) Stat(ctx context.Context, rawPath string) (StatResult, error) {
	if err := ctx.Err(); err != nil {
		return StatResult{}, err
	}

	absPath, err := resolveAbsolutePath(rawPath)
	if err != nil {
		return StatResult{}, err
	}

	info, err := os.Stat(absPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return StatResult{
				Path:   absPath,
				Exists: false,
			}, nil
		}
		return StatResult{}, err
	}

	return statFromFileInfo(absPath, info), nil
}

func (s *Service) List(ctx context.Context, rawPath string) ([]ListEntry, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	absPath, err := resolveAbsolutePath(rawPath)
	if err != nil {
		return nil, err
	}

	info, err := os.Stat(absPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, ErrPathNotFound
		}
		return nil, err
	}
	if !info.IsDir() {
		return nil, ErrPathNotDirectory
	}

	f, err := os.Open(absPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	out := make([]ListEntry, 0, minInt(s.cfg.MaxListEntries, dirReadBatchSize))
	for len(out) < s.cfg.MaxListEntries {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		chunkLimit := minInt(dirReadBatchSize, s.cfg.MaxListEntries-len(out))
		chunk, readErr := f.ReadDir(chunkLimit)
		for _, entry := range chunk {
			out = append(out, ListEntry{
				Name:  entry.Name(),
				Path:  filepath.Join(absPath, entry.Name()),
				IsDir: entry.IsDir(),
				Size:  0,
			})
		}

		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			return nil, readErr
		}
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].IsDir != out[j].IsDir {
			return out[i].IsDir
		}
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})

	return out, nil
}

func (s *Service) ReadText(ctx context.Context, rawPath string) (ReadResult, error) {
	if err := ctx.Err(); err != nil {
		return ReadResult{}, err
	}

	absPath, err := resolveAbsolutePath(rawPath)
	if err != nil {
		return ReadResult{}, err
	}

	info, err := os.Stat(absPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return ReadResult{}, ErrPathNotFound
		}
		return ReadResult{}, err
	}
	if info.IsDir() {
		return ReadResult{}, ErrPathIsDirectory
	}
	if !info.Mode().IsRegular() {
		return ReadResult{}, ErrUnsupportedFileType
	}
	if info.Size() > s.cfg.MaxReadFileBytes {
		return ReadResult{}, ErrFileTooLarge
	}

	file, err := os.Open(absPath)
	if err != nil {
		return ReadResult{}, err
	}
	defer file.Close()

	content, err := io.ReadAll(io.LimitReader(file, s.cfg.MaxReadFileBytes+1))
	if err != nil {
		return ReadResult{}, err
	}
	if int64(len(content)) > s.cfg.MaxReadFileBytes {
		return ReadResult{}, ErrFileTooLarge
	}
	if bytes.IndexByte(content, 0x00) >= 0 {
		return ReadResult{}, ErrBinaryFile
	}

	return ReadResult{
		Path:    absPath,
		Size:    int64(len(content)),
		Content: string(content),
	}, nil
}

func (s *Service) WriteText(ctx context.Context, rawPath, content string) (StatResult, error) {
	if err := ctx.Err(); err != nil {
		return StatResult{}, err
	}
	if int64(len(content)) > s.cfg.MaxWriteFileBytes {
		return StatResult{}, ErrContentTooLarge
	}

	absPath, err := resolveAbsolutePath(rawPath)
	if err != nil {
		return StatResult{}, err
	}
	if isFilesystemRoot(absPath) {
		return StatResult{}, ErrRefuseFilesystemRoot
	}

	if existing, statErr := os.Lstat(absPath); statErr == nil {
		if existing.Mode()&os.ModeSymlink != 0 {
			return StatResult{}, ErrUnsupportedFileType
		}
		if existing.IsDir() {
			return StatResult{}, ErrPathIsDirectory
		}
		if !existing.Mode().IsRegular() {
			return StatResult{}, ErrUnsupportedFileType
		}
	} else if !errors.Is(statErr, os.ErrNotExist) {
		return StatResult{}, statErr
	}

	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return StatResult{}, err
	}
	if err := writeFileAtomic(absPath, []byte(content), 0o644); err != nil {
		return StatResult{}, err
	}

	info, err := os.Stat(absPath)
	if err != nil {
		return StatResult{}, err
	}
	return statFromFileInfo(absPath, info), nil
}

func (s *Service) Create(ctx context.Context, rawPath string, isDir bool) (StatResult, error) {
	if err := ctx.Err(); err != nil {
		return StatResult{}, err
	}

	absPath, err := resolveAbsolutePath(rawPath)
	if err != nil {
		return StatResult{}, err
	}
	if isFilesystemRoot(absPath) {
		return StatResult{}, ErrRefuseFilesystemRoot
	}

	if isDir {
		if err := os.MkdirAll(absPath, 0o755); err != nil {
			return StatResult{}, err
		}
	} else {
		if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
			return StatResult{}, err
		}
		f, err := os.OpenFile(absPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
		if err != nil {
			if errors.Is(err, os.ErrExist) {
				return StatResult{}, ErrFileAlreadyExists
			}
			return StatResult{}, err
		}
		_ = f.Close()
	}

	info, err := os.Stat(absPath)
	if err != nil {
		return StatResult{}, err
	}
	return statFromFileInfo(absPath, info), nil
}

func (s *Service) Delete(ctx context.Context, rawPath string, recursive bool) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	absPath, err := resolveAbsolutePath(rawPath)
	if err != nil {
		return err
	}
	if isFilesystemRoot(absPath) {
		return ErrRefuseFilesystemRoot
	}

	info, err := os.Lstat(absPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return ErrPathNotFound
		}
		return err
	}

	if recursive {
		return os.RemoveAll(absPath)
	}

	if info.IsDir() {
		return ErrDirectoryNeedsRecursive
	}
	return os.Remove(absPath)
}

func (s *Service) WorkspaceOpen(ctx context.Context, paths []string) ([]StatResult, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if len(paths) == 0 {
		return nil, ErrNoWorkspacePaths
	}
	if len(paths) > s.cfg.MaxWorkspaceOpenPath {
		return nil, ErrTooManyWorkspacePaths
	}

	out := make([]StatResult, 0, len(paths))
	for _, rawPath := range paths {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		absPath, err := resolveAbsolutePath(rawPath)
		if err != nil {
			out = append(out, StatResult{Path: rawPath, Exists: false})
			continue
		}

		info, err := os.Stat(absPath)
		if err != nil {
			out = append(out, StatResult{Path: absPath, Exists: false})
			continue
		}
		out = append(out, statFromFileInfo(absPath, info))
	}

	return out, nil
}

func resolveAbsolutePath(rawPath string) (string, error) {
	if strings.TrimSpace(rawPath) == "" {
		return "", ErrPathRequired
	}

	absPath, err := filepath.Abs(filepath.Clean(rawPath))
	if err != nil {
		return "", ErrInvalidPath
	}
	return absPath, nil
}

func statFromFileInfo(path string, info os.FileInfo) StatResult {
	return StatResult{
		Path:    path,
		Exists:  true,
		Size:    info.Size(),
		IsDir:   info.IsDir(),
		ModTime: info.ModTime(),
	}
}

func writeFileAtomic(path string, content []byte, perms os.FileMode) error {
	parent := filepath.Dir(path)
	tempFile, err := os.CreateTemp(parent, ".omt-write-*")
	if err != nil {
		return err
	}
	tempPath := tempFile.Name()

	cleanup := func(retErr error) error {
		_ = tempFile.Close()
		_ = os.Remove(tempPath)
		return retErr
	}

	if _, err := tempFile.Write(content); err != nil {
		return cleanup(err)
	}
	if err := tempFile.Sync(); err != nil {
		return cleanup(err)
	}
	if err := tempFile.Chmod(perms); err != nil {
		return cleanup(err)
	}
	if err := tempFile.Close(); err != nil {
		return cleanup(err)
	}
	if err := os.Rename(tempPath, path); err != nil {
		return cleanup(err)
	}
	return nil
}

func isFilesystemRoot(path string) bool {
	clean := filepath.Clean(path)
	volume := filepath.VolumeName(clean)
	if volume != "" {
		if clean == volume {
			return true
		}
		return clean == volume+string(filepath.Separator)
	}
	return clean == string(filepath.Separator)
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
