package config

import (
	"os"
	"strings"
	"time"
)

const defaultAddr = "127.0.0.1:8080"
const defaultShutdownTimeout = 10 * time.Second

type Config struct {
	Addr            string
	ShutdownTimeout time.Duration
}

func LoadFromEnv() Config {
	addr := defaultAddr
	if envAddr := strings.TrimSpace(os.Getenv("ACS_SERVER_ADDR")); envAddr != "" {
		addr = envAddr
	}

	return Config{
		Addr:            addr,
		ShutdownTimeout: defaultShutdownTimeout,
	}
}
