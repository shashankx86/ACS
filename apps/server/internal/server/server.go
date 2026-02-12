package server

import (
	"context"
	"net/http"

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
