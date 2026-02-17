package handlers

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	fsservice "local/monorepo/internal/fs"
)

const (
	maxWriteRequestBodyBytes = 6 * 1024 * 1024
	maxPathRequestBodyBytes  = 128 * 1024
	maxWorkspaceRequestBytes = 256 * 1024
)

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

type FSHandler struct {
	service *fsservice.Service
}

func NewFSHandler(service *fsservice.Service) *FSHandler {
	if service == nil {
		service = fsservice.NewService(fsservice.DefaultConfig())
	}
	return &FSHandler{service: service}
}

func (h *FSHandler) Stat(w http.ResponseWriter, r *http.Request) {
	if !requireFSAccess(w, r, http.MethodGet, "fs stat") {
		return
	}

	result, err := h.service.Stat(r.Context(), r.URL.Query().Get("path"))
	if err != nil {
		writeFSError(w, err)
		return
	}

	writeJSON(w, toFSStatResponse(result))
}

func (h *FSHandler) List(w http.ResponseWriter, r *http.Request) {
	if !requireFSAccess(w, r, http.MethodGet, "fs list") {
		return
	}

	entries, err := h.service.List(r.Context(), r.URL.Query().Get("path"))
	if err != nil {
		writeFSError(w, err)
		return
	}

	out := make([]FSListEntry, 0, len(entries))
	for _, entry := range entries {
		out = append(out, FSListEntry{
			Name:  entry.Name,
			Path:  entry.Path,
			IsDir: entry.IsDir,
			Size:  entry.Size,
		})
	}
	writeJSON(w, out)
}

func (h *FSHandler) Read(w http.ResponseWriter, r *http.Request) {
	if !requireFSAccess(w, r, http.MethodGet, "fs read") {
		return
	}

	result, err := h.service.ReadText(r.Context(), r.URL.Query().Get("path"))
	if err != nil {
		writeFSError(w, err)
		return
	}

	writeJSON(w, FSReadResponse{
		Path:    result.Path,
		Size:    result.Size,
		Content: result.Content,
	})
}

func (h *FSHandler) Write(w http.ResponseWriter, r *http.Request) {
	if !requireFSAccess(w, r, http.MethodPost, "fs write") {
		return
	}

	var req struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	if !decodeJSONBody(w, r, &req, maxWriteRequestBodyBytes) {
		return
	}

	result, err := h.service.WriteText(r.Context(), req.Path, req.Content)
	if err != nil {
		writeFSError(w, err)
		return
	}

	writeJSON(w, toFSStatResponse(result))
}

func (h *FSHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !requireFSAccess(w, r, http.MethodPost, "fs create") {
		return
	}

	var req struct {
		Path  string `json:"path"`
		IsDir bool   `json:"isDir"`
	}
	if !decodeJSONBody(w, r, &req, maxPathRequestBodyBytes) {
		return
	}

	result, err := h.service.Create(r.Context(), req.Path, req.IsDir)
	if err != nil {
		writeFSError(w, err)
		return
	}

	writeJSON(w, toFSStatResponse(result))
}

func (h *FSHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if !requireFSAccess(w, r, http.MethodPost, "fs delete") {
		return
	}

	var req struct {
		Path      string `json:"path"`
		Recursive bool   `json:"recursive"`
	}
	if !decodeJSONBody(w, r, &req, maxPathRequestBodyBytes) {
		return
	}

	if err := h.service.Delete(r.Context(), req.Path, req.Recursive); err != nil {
		writeFSError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *FSHandler) WorkspaceOpen(w http.ResponseWriter, r *http.Request) {
	if !requireFSAccess(w, r, http.MethodPost, "workspace open") {
		return
	}

	var req WorkspaceOpenRequest
	if !decodeJSONBody(w, r, &req, maxWorkspaceRequestBytes) {
		return
	}

	stats, err := h.service.WorkspaceOpen(r.Context(), req.Paths)
	if err != nil {
		writeFSError(w, err)
		return
	}

	out := make([]FSStatResponse, 0, len(stats))
	for _, stat := range stats {
		out = append(out, toFSStatResponse(stat))
	}
	writeJSON(w, WorkspaceOpenResponse{Paths: out})
}

func toFSStatResponse(stat fsservice.StatResult) FSStatResponse {
	return FSStatResponse{
		Path:    stat.Path,
		Exists:  stat.Exists,
		Size:    stat.Size,
		IsDir:   stat.IsDir,
		ModTime: stat.ModTime,
	}
}

func requireFSAccess(w http.ResponseWriter, r *http.Request, method, operation string) bool {
	if r.Method != method {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return false
	}
	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, operation+" only allows loopback clients", http.StatusForbidden)
		return false
	}
	if !isAllowedTerminalOrigin(r.Header.Get("Origin")) {
		http.Error(w, "forbidden origin", http.StatusForbidden)
		return false
	}
	if !isValidFSToken(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}

func isValidFSToken(r *http.Request) bool {
	expectedToken := strings.TrimSpace(os.Getenv("OMT_TERMINAL_AUTH_TOKEN"))
	if expectedToken == "" {
		return true
	}

	providedToken := strings.TrimSpace(r.Header.Get("X-OMT-Token"))
	if providedToken == "" {
		providedToken = strings.TrimSpace(r.URL.Query().Get("token"))
	}
	if providedToken == "" {
		return false
	}

	return subtle.ConstantTimeCompare([]byte(providedToken), []byte(expectedToken)) == 1
}

func decodeJSONBody(w http.ResponseWriter, r *http.Request, into interface{}, maxBytes int64) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(into); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return false
	}

	return true
}

func writeFSError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, context.Canceled):
		http.Error(w, "request canceled", http.StatusRequestTimeout)
	case errors.Is(err, context.DeadlineExceeded):
		http.Error(w, "request timed out", http.StatusRequestTimeout)
	case errors.Is(err, fsservice.ErrPathRequired), errors.Is(err, fsservice.ErrInvalidPath):
		http.Error(w, "invalid path", http.StatusBadRequest)
	case errors.Is(err, fsservice.ErrPathNotFound):
		http.Error(w, "path does not exist", http.StatusNotFound)
	case errors.Is(err, fsservice.ErrPathNotDirectory):
		http.Error(w, "path is not a directory", http.StatusBadRequest)
	case errors.Is(err, fsservice.ErrPathIsDirectory):
		http.Error(w, "path is a directory", http.StatusBadRequest)
	case errors.Is(err, fsservice.ErrDirectoryNeedsRecursive):
		http.Error(w, "directory delete requires recursive=true", http.StatusConflict)
	case errors.Is(err, fsservice.ErrFileTooLarge):
		http.Error(w, "file too large to read", http.StatusRequestEntityTooLarge)
	case errors.Is(err, fsservice.ErrContentTooLarge):
		http.Error(w, "content too large", http.StatusRequestEntityTooLarge)
	case errors.Is(err, fsservice.ErrBinaryFile), errors.Is(err, fsservice.ErrUnsupportedFileType):
		http.Error(w, "unsupported file type", http.StatusUnsupportedMediaType)
	case errors.Is(err, fsservice.ErrRefuseFilesystemRoot):
		http.Error(w, "refusing to mutate filesystem root", http.StatusBadRequest)
	case errors.Is(err, fsservice.ErrFileAlreadyExists):
		http.Error(w, "file already exists", http.StatusConflict)
	case errors.Is(err, fsservice.ErrNoWorkspacePaths):
		http.Error(w, "no paths provided", http.StatusBadRequest)
	case errors.Is(err, fsservice.ErrTooManyWorkspacePaths):
		http.Error(w, "too many paths provided", http.StatusBadRequest)
	default:
		http.Error(w, "filesystem operation failed", http.StatusInternalServerError)
	}
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}
