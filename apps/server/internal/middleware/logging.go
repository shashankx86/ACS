package middleware

import (
	"bufio"
	"net"
	"net/http"
	"time"

	"go.uber.org/zap"
)

type loggingResponseWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (lrw *loggingResponseWriter) WriteHeader(status int) {
	lrw.status = status
	lrw.ResponseWriter.WriteHeader(status)
}

func (lrw *loggingResponseWriter) Write(p []byte) (int, error) {
	if lrw.status == 0 {
		lrw.status = http.StatusOK
	}
	n, err := lrw.ResponseWriter.Write(p)
	lrw.bytes += n
	return n, err
}

func (lrw *loggingResponseWriter) Flush() {
	if flusher, ok := lrw.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (lrw *loggingResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hijacker, ok := lrw.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, http.ErrNotSupported
	}

	if lrw.status == 0 {
		lrw.status = http.StatusSwitchingProtocols
	}

	return hijacker.Hijack()
}

func (lrw *loggingResponseWriter) Push(target string, opts *http.PushOptions) error {
	pusher, ok := lrw.ResponseWriter.(http.Pusher)
	if !ok {
		return http.ErrNotSupported
	}

	return pusher.Push(target, opts)
}

func RequestLogger(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			lrw := &loggingResponseWriter{ResponseWriter: w}

			next.ServeHTTP(lrw, r)

			fields := []zap.Field{
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
				zap.Int("status", lrw.status),
				zap.Int("bytes", lrw.bytes),
				zap.Duration("duration", time.Since(start)),
				zap.String("remote_addr", r.RemoteAddr),
				zap.String("user_agent", r.UserAgent()),
			}
			if requestID := r.Header.Get("X-Request-Id"); requestID != "" {
				fields = append(fields, zap.String("request_id", requestID))
			}

			logger.Info("request", fields...)
		})
	}
}
