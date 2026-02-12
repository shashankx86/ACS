package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const maxReadFileBytes = 5 * 1024 * 1024 // 5 MiB

type FSStatResponse struct {
	Path    string    `json:"path"`
	Exists  bool      `json:"exists"`
	Size    int64     `json:"size,omitempty"`
	IsDir   bool      `json:"isDir"`
	ModTime time.Time `json:"modTime,omitempty"`
}

type FSListEntry struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
	Size  int64  `json:"size"`
}

type FSReadResponse struct {
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	Content string `json:"content"`
}

type WorkspaceOpenRequest struct {
	Paths []string `json:"paths"`
}

type WorkspaceOpenResponse struct {
	Paths []FSStatResponse `json:"paths"`
}

func FsStatHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, "fs stat only allows loopback clients", http.StatusForbidden)
		return
	}

	p := r.URL.Query().Get("path")
	if p == "" {
		http.Error(w, "missing path parameter", http.StatusBadRequest)
		return
	}

	abs, err := filepath.Abs(filepath.Clean(p))
	if err != nil {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(abs)
	if errors.Is(err, os.ErrNotExist) {
		resp := FSStatResponse{Path: abs, Exists: false, IsDir: false}
		writeJSON(w, resp)
		return
	}
	if err != nil {
		http.Error(w, "failed to stat path", http.StatusInternalServerError)
		return
	}

	resp := FSStatResponse{
		Path:    abs,
		Exists:  true,
		Size:    info.Size(),
		IsDir:   info.IsDir(),
		ModTime: info.ModTime(),
	}

	writeJSON(w, resp)
}

func FsListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, "fs list only allows loopback clients", http.StatusForbidden)
		return
	}

	p := r.URL.Query().Get("path")
	if p == "" {
		http.Error(w, "missing path parameter", http.StatusBadRequest)
		return
	}

	abs, err := filepath.Abs(filepath.Clean(p))
	if err != nil {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(abs)
	if err != nil {
		http.Error(w, "failed to stat path", http.StatusInternalServerError)
		return
	}

	if !info.IsDir() {
		http.Error(w, "path is not a directory", http.StatusBadRequest)
		return
	}

	f, err := os.Open(abs)
	if err != nil {
		http.Error(w, "failed to open directory", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	entries, err := f.Readdir(0)
	if err != nil && err != io.EOF {
		http.Error(w, "failed to read directory", http.StatusInternalServerError)
		return
	}

	out := make([]FSListEntry, 0, len(entries))
	for _, e := range entries {
		out = append(out, FSListEntry{
			Name:  e.Name(),
			Path:  filepath.Join(abs, e.Name()),
			IsDir: e.IsDir(),
			Size:  e.Size(),
		})
	}

	writeJSON(w, out)
}

func FsReadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, "fs read only allows loopback clients", http.StatusForbidden)
		return
	}

	p := r.URL.Query().Get("path")
	if p == "" {
		http.Error(w, "missing path parameter", http.StatusBadRequest)
		return
	}

	abs, err := filepath.Abs(filepath.Clean(p))
	if err != nil {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(abs)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			http.Error(w, "file does not exist", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to stat file", http.StatusInternalServerError)
		return
	}

	if info.IsDir() {
		http.Error(w, "path is a directory", http.StatusBadRequest)
		return
	}

	if info.Size() > maxReadFileBytes {
		http.Error(w, "file too large to read", http.StatusRequestEntityTooLarge)
		return
	}

	b, err := os.ReadFile(abs)
	if err != nil {
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}

	writeJSON(w, FSReadResponse{Path: abs, Size: int64(len(b)), Content: string(b)})
}

func WorkspacesOpenHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, "workspace open only allows loopback clients", http.StatusForbidden)
		return
	}

	var req WorkspaceOpenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Paths) == 0 {
		http.Error(w, "no paths provided", http.StatusBadRequest)
		return
	}

	out := make([]FSStatResponse, 0, len(req.Paths))
	for _, p := range req.Paths {
		abs, err := filepath.Abs(filepath.Clean(p))
		if err != nil {
			out = append(out, FSStatResponse{Path: p, Exists: false})
			continue
		}

		info, err := os.Stat(abs)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				out = append(out, FSStatResponse{Path: abs, Exists: false})
				continue
			}
			out = append(out, FSStatResponse{Path: abs, Exists: false})
			continue
		}

		out = append(out, FSStatResponse{Path: abs, Exists: true, Size: info.Size(), IsDir: info.IsDir(), ModTime: info.ModTime()})
	}

	writeJSON(w, WorkspaceOpenResponse{Paths: out})
}

// Write file contents (create or overwrite)
func FsWriteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, "fs write only allows loopback clients", http.StatusForbidden)
		return
	}

	var req struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Path) == "" {
		http.Error(w, "missing path", http.StatusBadRequest)
		return
	}

	abs, err := filepath.Abs(filepath.Clean(req.Path))
	if err != nil {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		http.Error(w, "failed to create parent directories", http.StatusInternalServerError)
		return
	}

	if err := os.WriteFile(abs, []byte(req.Content), 0o644); err != nil {
		http.Error(w, "failed to write file", http.StatusInternalServerError)
		return
	}

	info, err := os.Stat(abs)
	if err != nil {
		http.Error(w, "written but failed to stat file", http.StatusInternalServerError)
		return
	}

	writeJSON(w, FSStatResponse{Path: abs, Exists: true, Size: info.Size(), IsDir: info.IsDir(), ModTime: info.ModTime()})
}

// Create a file or directory
func FsCreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, "fs create only allows loopback clients", http.StatusForbidden)
		return
	}

	var req struct {
		Path  string `json:"path"`
		IsDir bool   `json:"isDir"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Path) == "" {
		http.Error(w, "missing path", http.StatusBadRequest)
		return
	}

	abs, err := filepath.Abs(filepath.Clean(req.Path))
	if err != nil {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	if req.IsDir {
		if err := os.MkdirAll(abs, 0o755); err != nil {
			http.Error(w, "failed to create directory", http.StatusInternalServerError)
			return
		}
	} else {
		if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
			http.Error(w, "failed to create parent directories", http.StatusInternalServerError)
			return
		}
		f, err := os.OpenFile(abs, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
		if err != nil {
			if errors.Is(err, os.ErrExist) {
				http.Error(w, "file already exists", http.StatusConflict)
				return
			}
			http.Error(w, "failed to create file", http.StatusInternalServerError)
			return
		}
		_ = f.Close()
	}

	info, err := os.Stat(abs)
	if err != nil {
		http.Error(w, "created but failed to stat", http.StatusInternalServerError)
		return
	}

	writeJSON(w, FSStatResponse{Path: abs, Exists: true, Size: info.Size(), IsDir: info.IsDir(), ModTime: info.ModTime()})
}

// Delete a file or directory (recursive when requested)
func FsDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, "fs delete only allows loopback clients", http.StatusForbidden)
		return
	}

	var req struct {
		Path      string `json:"path"`
		Recursive bool   `json:"recursive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Path) == "" {
		http.Error(w, "missing path", http.StatusBadRequest)
		return
	}

	abs, err := filepath.Abs(filepath.Clean(req.Path))
	if err != nil {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	if req.Recursive {
		if err := os.RemoveAll(abs); err != nil {
			http.Error(w, "failed to remove path", http.StatusInternalServerError)
			return
		}
	} else {
		if err := os.Remove(abs); err != nil {
			http.Error(w, "failed to remove path", http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

// helper: small JSON writer
func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}
