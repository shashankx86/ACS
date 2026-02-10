#!/usr/bin/env bash
set -euo pipefail

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing '$1' in PATH"
    case "$1" in
      air)
        echo "install: go install github.com/air-verse/air@latest"
        ;;
      watchexec)
        echo "install: cargo install watchexec-cli (or system package manager)"
        ;;
    esac
    exit 1
  fi
}

resolve_air() {
  if command -v air >/dev/null 2>&1; then
    echo "air"
    return 0
  fi

  if [[ -n "${AIR_BIN:-}" ]] && [[ -x "${AIR_BIN}" ]]; then
    echo "${AIR_BIN}"
    return 0
  fi

  local gobin
  gobin="$(go env GOBIN 2>/dev/null || true)"
  if [[ -z "${gobin}" ]]; then
    gobin="$(go env GOPATH 2>/dev/null || true)/bin"
  fi

  if [[ -n "${gobin}" ]] && [[ -x "${gobin}/air" ]]; then
    echo "${gobin}/air"
    return 0
  fi

  return 1
}

AIR_CMD="$(resolve_air || true)"
if [[ -z "${AIR_CMD}" ]]; then
  echo "missing 'air' in PATH"
  echo "install: go install github.com/air-verse/air@latest"
  echo "or set AIR_BIN to the air binary path"
  exit 1
fi

require watchexec

prefix() {
  local tag="$1"
  shift
  stdbuf -oL -eL "$@" 2>&1 | awk -v tag="$tag" '{print "[" tag "] " $0; fflush()}'
}

SERVER_PID=""
DESKTOP_PID=""

stop_children() {
  if [[ -n "${SERVER_PID}" ]]; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
  if [[ -n "${DESKTOP_PID}" ]]; then
    kill "${DESKTOP_PID}" 2>/dev/null || true
  fi
}

cleanup() {
  local status=${1:-$?}
  stop_children
  wait || true
  exit "$status"
}

trap 'cleanup $?' INT TERM EXIT

while true; do
  (cd apps/server && prefix server "${AIR_CMD}" </dev/null) &
  SERVER_PID=$!

  (
    cd apps/desktop && \
    RIFF_DEV_ASSUME_SERVER=1 \
    prefix desktop watchexec --restart --watch src --watch build.zig --ignore .zig-cache --ignore zig-out -- zig build run </dev/null
  ) &
  DESKTOP_PID=$!

  restart_requested=0
  exit_reason=""

  while true; do
    if IFS= read -r -t 0.2 _; then
      restart_requested=1
      break
    fi
    if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
      exit_reason="server"
      break
    fi
    if ! kill -0 "${DESKTOP_PID}" 2>/dev/null; then
      exit_reason="desktop"
      break
    fi
  done

  if [[ "${restart_requested}" -eq 1 ]]; then
    stop_children
    wait || true
    continue
  fi

  if [[ "${exit_reason}" == "server" ]]; then
    wait "${SERVER_PID}" || true
    stop_children
    wait || true
    echo "[dev] server exited; shutting down..."
    exit 1
  fi

  if [[ "${exit_reason}" == "desktop" ]]; then
    wait "${DESKTOP_PID}" || true
    stop_children
    wait || true
    echo "[dev] desktop exited; shutting down..."
    exit 1
  fi
 done
