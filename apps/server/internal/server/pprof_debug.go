//go:build debug

package server

import (
	"net/http"
	"net/http/pprof"

	"local/monorepo/internal/config"
)

func registerDebugRoutes(mux *http.ServeMux, _ config.Config) {
	mux.HandleFunc("/debug/pprof/", pprof.Index)
	mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
	mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
}
