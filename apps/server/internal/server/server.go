package server

import (
	"context"
	"net/http"
	"os"
	"path/filepath"

	"go.uber.org/zap"

	"local/monorepo/internal/config"
	"local/monorepo/internal/handlers"
	"local/monorepo/internal/middleware"
)

type Server struct {
	srv    *http.Server
	logger *zap.Logger
	errCh  chan error
}

func New(cfg config.Config, logger *zap.Logger) *Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/global/health", handlers.HealthHandler)
	mux.HandleFunc("/v1/terminals/auth", handlers.TerminalAuthHandler)
	mux.HandleFunc("/v1/terminals/ws", handlers.TerminalWebSocketHandler)

	// filesystem / workspace APIs
	mux.HandleFunc("/v1/fs/stat", handlers.FsStatHandler)
	mux.HandleFunc("/v1/fs/list", handlers.FsListHandler)
	mux.HandleFunc("/v1/fs/read", handlers.FsReadHandler)
	mux.HandleFunc("/v1/fs/write", handlers.FsWriteHandler)
	mux.HandleFunc("/v1/fs/create", handlers.FsCreateHandler)
	mux.HandleFunc("/v1/fs/delete", handlers.FsDeleteHandler)
	mux.HandleFunc("/v1/workspaces/open", handlers.WorkspacesOpenHandler)

	// optionally serve the renderer web UI (serve-web)
	webRoot := os.Getenv("OMT_WEB_ROOT")
	if webRoot == "" {
		// try common development locations
		candidates := []string{
			filepath.Join("..", "desktop", "renderer", "dist"),
			filepath.Join("..", "..", "apps", "desktop", "renderer", "dist"),
		}
		for _, c := range candidates {
			if fi, err := os.Stat(c); err == nil && fi.IsDir() {
				webRoot = c
				break
			}
		}
	}
	if webRoot != "" {
		fs := http.FileServer(http.Dir(webRoot))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			// prefer static file if it exists, otherwise SPA index.html
			p := filepath.Join(webRoot, filepath.Clean(r.URL.Path))
			if info, err := os.Stat(p); err == nil && !info.IsDir() {
				fs.ServeHTTP(w, r)
				return
			}
			http.ServeFile(w, r, filepath.Join(webRoot, "index.html"))
		})
	}

	handler := middleware.Recovery(logger)(middleware.RequestLogger(logger)(mux))
	srv := &http.Server{
		Addr:    cfg.Addr,
		Handler: handler,
	}

	return &Server{srv: srv, logger: logger}
}

func (s *Server) Start() <-chan error {
	s.errCh = make(chan error, 1)
	go func() {
		s.logger.Info("server starting", zap.String("addr", s.srv.Addr))
		s.errCh <- s.srv.ListenAndServe()
	}()
	return s.errCh
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.srv.Shutdown(ctx)
}
