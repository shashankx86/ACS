//go:build !debug

package server

import (
	"net/http"

	"local/monorepo/internal/config"
)

func registerDebugRoutes(_ *http.ServeMux, _ config.Config) {}
