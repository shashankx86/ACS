package log

import (
	"os"
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

const (
	defaultLevel  = "info"
	defaultFormat = "json"
)

func InitFromEnv() (*zap.Logger, func()) {
	levelStr := strings.ToLower(strings.TrimSpace(os.Getenv("LOG_LEVEL")))
	if levelStr == "" {
		levelStr = defaultLevel
	}
	formatStr := strings.ToLower(strings.TrimSpace(os.Getenv("LOG_FORMAT")))
	if formatStr == "" {
		formatStr = defaultFormat
	}

	level := zapcore.InfoLevel
	invalidLevel := false
	if err := level.UnmarshalText([]byte(levelStr)); err != nil {
		invalidLevel = true
		level = zapcore.InfoLevel
	}

	invalidFormat := false
	encoder := jsonEncoder()
	if formatStr == "console" {
		encoder = consoleEncoder()
	} else if formatStr != "json" {
		invalidFormat = true
		formatStr = defaultFormat
	}

	core := zapcore.NewCore(encoder, zapcore.AddSync(os.Stdout), level)
	logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

	if invalidLevel {
		logger.Warn("invalid LOG_LEVEL, defaulting to info", zap.String("log_level", levelStr))
	}
	if invalidFormat {
		logger.Warn("invalid LOG_FORMAT, defaulting to json", zap.String("log_format", formatStr))
	}

	cleanup := func() {
		_ = logger.Sync()
	}
	return logger, cleanup
}

func consoleEncoder() zapcore.Encoder {
	cfg := zap.NewDevelopmentEncoderConfig()
	cfg.EncodeTime = zapcore.ISO8601TimeEncoder
	return zapcore.NewConsoleEncoder(cfg)
}

func jsonEncoder() zapcore.Encoder {
	cfg := zap.NewProductionEncoderConfig()
	cfg.EncodeTime = zapcore.ISO8601TimeEncoder
	return zapcore.NewJSONEncoder(cfg)
}
