package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"go.uber.org/zap"

	"local/monorepo/internal/config"
	"local/monorepo/internal/log"
	"local/monorepo/internal/server"
)

func main() {
	logger, cleanup := log.InitFromEnv()
	defer cleanup()

	cfg := config.LoadFromEnv()
	srv := server.New(cfg, logger)
	errCh := srv.Start()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case sig := <-stop:
		logger.Info("shutdown initiated", zap.String("signal", sig.String()))
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal("server error", zap.Error(err))
		}
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("shutdown error", zap.Error(err))
		return
	}
	logger.Info("shutdown complete")
}
