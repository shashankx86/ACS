package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

const terminalWriteTimeout = 5 * time.Second
const terminalPongWait = 60 * time.Second
const terminalPingInterval = 20 * time.Second

var terminalUpgrader = websocket.Upgrader{
	ReadBufferSize:  32 * 1024,
	WriteBufferSize: 32 * 1024,
	CheckOrigin: func(r *http.Request) bool {
		return isAllowedTerminalOrigin(r.Header.Get("Origin"))
	},
}

type terminalControlMessage struct {
	Type string `json:"type"`
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

type terminalEventMessage struct {
	Type    string `json:"type"`
	Message string `json:"message,omitempty"`
	Code    int    `json:"code,omitempty"`
	Shell   string `json:"shell,omitempty"`
}

type inboundTerminalMessage struct {
	messageType int
	payload     []byte
}

type terminalSocketWriter struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

func (w *terminalSocketWriter) writeMessage(messageType int, payload []byte) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if err := w.conn.SetWriteDeadline(time.Now().Add(terminalWriteTimeout)); err != nil {
		return err
	}

	return w.conn.WriteMessage(messageType, payload)
}

func (w *terminalSocketWriter) writeJSON(message terminalEventMessage) error {
	payload, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return w.writeMessage(websocket.TextMessage, payload)
}

func TerminalAuthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, "terminal auth only allows loopback clients", http.StatusForbidden)
		return
	}

	if !isValidTerminalToken(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func TerminalWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !isLoopbackRemote(r.RemoteAddr) {
		http.Error(w, "terminal websocket only allows loopback clients", http.StatusForbidden)
		return
	}

	if !isValidTerminalToken(r) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if runtime.GOOS == "windows" {
		http.Error(w, "terminal websocket is not supported on windows", http.StatusNotImplemented)
		return
	}

	conn, err := terminalUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	conn.SetReadLimit(1024 * 1024)
	_ = conn.SetReadDeadline(time.Now().Add(terminalPongWait))
	conn.SetPongHandler(func(_ string) error {
		return conn.SetReadDeadline(time.Now().Add(terminalPongWait))
	})

	writer := &terminalSocketWriter{conn: conn}
	doneCh := make(chan struct{})
	defer close(doneCh)

	cmd, shellPath := buildShellCommand()
	ptyFile, err := pty.Start(cmd)
	if err != nil {
		_ = writer.writeJSON(terminalEventMessage{
			Type:    "error",
			Message: fmt.Sprintf("failed to start terminal shell: %v", err),
		})
		return
	}
	defer ptyFile.Close()

	waitCh := make(chan error, 1)
	go func() {
		waitCh <- cmd.Wait()
	}()

	defer func() {
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}

		select {
		case <-waitCh:
		default:
		}
	}()

	if err := setPTYSize(ptyFile, 120, 32); err != nil {
		_ = writer.writeJSON(terminalEventMessage{
			Type:    "error",
			Message: fmt.Sprintf("failed to set initial terminal size: %v", err),
		})
	}

	_ = writer.writeJSON(terminalEventMessage{Type: "ready", Shell: shellPath})

	inboundCh := make(chan inboundTerminalMessage, 64)
	readErrCh := make(chan error, 1)
	go func() {
		for {
			messageType, payload, err := conn.ReadMessage()
			if err != nil {
				select {
				case readErrCh <- err:
				default:
				}
				return
			}

			message := inboundTerminalMessage{
				messageType: messageType,
				payload:     payload,
			}

			select {
			case inboundCh <- message:
			case <-doneCh:
				return
			}
		}
	}()

	go func() {
		ticker := time.NewTicker(terminalPingInterval)
		defer ticker.Stop()

		for {
			select {
			case <-doneCh:
				return
			case <-ticker.C:
				if err := writer.writeMessage(websocket.PingMessage, nil); err != nil {
					select {
					case readErrCh <- err:
					default:
					}
					return
				}
			}
		}
	}()

	ptyErrCh := make(chan error, 1)
	go func() {
		buffer := make([]byte, 32*1024)
		for {
			readBytes, err := ptyFile.Read(buffer)
			if readBytes > 0 {
				chunk := make([]byte, readBytes)
				copy(chunk, buffer[:readBytes])
				if writeErr := writer.writeMessage(websocket.BinaryMessage, chunk); writeErr != nil {
					select {
					case ptyErrCh <- writeErr:
					default:
					}
					return
				}
			}

			if err != nil {
				select {
				case ptyErrCh <- err:
				default:
				}
				return
			}
		}
	}()

	for {
		select {
		case message := <-inboundCh:
			switch message.messageType {
			case websocket.BinaryMessage:
				if len(message.payload) == 0 {
					continue
				}
				if _, err := ptyFile.Write(message.payload); err != nil {
					_ = writer.writeJSON(terminalEventMessage{Type: "error", Message: err.Error()})
					return
				}
			case websocket.TextMessage:
				if err := handleTerminalControlMessage(ptyFile, message.payload); err != nil {
					_ = writer.writeJSON(terminalEventMessage{Type: "error", Message: err.Error()})
				}
			case websocket.CloseMessage:
				return
			}
		case err := <-readErrCh:
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				return
			}
			_ = writer.writeJSON(terminalEventMessage{Type: "error", Message: err.Error()})
			return
		case err := <-ptyErrCh:
			if shouldTreatPTYErrorAsProcessExit(err) {
				select {
				case waitErr := <-waitCh:
					_ = writer.writeJSON(terminalEventMessage{Type: "exit", Code: extractExitCode(waitErr)})
				case <-time.After(terminalWriteTimeout):
				}
				return
			}
			_ = writer.writeJSON(terminalEventMessage{Type: "error", Message: err.Error()})
			return
		case err := <-waitCh:
			_ = writer.writeJSON(terminalEventMessage{Type: "exit", Code: extractExitCode(err)})
			return
		}
	}
}

func handleTerminalControlMessage(ptyFile *os.File, payload []byte) error {
	var message terminalControlMessage
	if err := json.Unmarshal(payload, &message); err != nil {
		return fmt.Errorf("invalid terminal control payload: %w", err)
	}

	switch message.Type {
	case "resize":
		if message.Cols == 0 || message.Rows == 0 {
			return errors.New("terminal resize requires cols and rows")
		}
		return setPTYSize(ptyFile, message.Cols, message.Rows)
	default:
		return fmt.Errorf("unsupported terminal control message: %s", message.Type)
	}
}

func setPTYSize(ptyFile *os.File, cols uint16, rows uint16) error {
	return pty.Setsize(ptyFile, &pty.Winsize{
		Cols: cols,
		Rows: rows,
	})
}

func buildShellCommand() (*exec.Cmd, string) {
	shellPath := strings.TrimSpace(os.Getenv("SHELL"))
	if shellPath == "" {
		shellPath = "/bin/bash"
	}

	args := []string{}
	switch filepath.Base(shellPath) {
	case "bash", "zsh", "fish", "sh":
		args = []string{"-l"}
	}

	command := exec.Command(shellPath, args...)
	command.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
	)

	if homeDir, err := os.UserHomeDir(); err == nil && strings.TrimSpace(homeDir) != "" {
		command.Dir = homeDir
	}

	return command, shellPath
}

func extractExitCode(err error) int {
	if err == nil {
		return 0
	}

	var exitError *exec.ExitError
	if errors.As(err, &exitError) {
		return exitError.ExitCode()
	}

	return -1
}

func shouldTreatPTYErrorAsProcessExit(err error) bool {
	if err == nil {
		return false
	}

	if errors.Is(err, io.EOF) || errors.Is(err, syscall.EIO) {
		return true
	}

	var pathError *os.PathError
	if errors.As(err, &pathError) && errors.Is(pathError.Err, syscall.EIO) {
		return true
	}

	return false
}

func isValidTerminalToken(r *http.Request) bool {
	expectedToken := strings.TrimSpace(os.Getenv("OMT_TERMINAL_AUTH_TOKEN"))
	if expectedToken == "" {
		return true
	}

	providedToken := strings.TrimSpace(r.URL.Query().Get("token"))
	if providedToken == "" {
		return false
	}

	return subtle.ConstantTimeCompare([]byte(providedToken), []byte(expectedToken)) == 1
}

func isLoopbackRemote(remoteAddr string) bool {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}

	host = strings.Trim(host, "[]")
	parsedIP := net.ParseIP(host)
	return parsedIP != nil && parsedIP.IsLoopback()
}

func isAllowedTerminalOrigin(origin string) bool {
	trimmed := strings.TrimSpace(origin)
	if trimmed == "" || trimmed == "null" {
		return true
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return false
	}

	if strings.EqualFold(parsed.Scheme, "file") {
		return true
	}

	hostname := strings.ToLower(parsed.Hostname())
	switch hostname {
	case "localhost", "127.0.0.1", "::1":
		return true
	default:
		return false
	}
}
