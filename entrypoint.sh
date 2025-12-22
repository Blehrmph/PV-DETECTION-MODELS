#!/bin/sh
set -e

MODE="${SERVICE_MODE:-full}"
PORT="${PORT:-8000}"
UVICORN_PORT="${UVICORN_PORT:-8001}"

export PORT UVICORN_PORT

render_nginx() {
  envsubst '${PORT} ${UVICORN_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
  printf 'window.__ENV__ = { VITE_API_URL: "%s" };\n' "${VITE_API_URL:-}" > /usr/share/nginx/html/config.js
}

start_backend() {
  exec python -m uvicorn main:app --host 0.0.0.0 --port "$UVICORN_PORT"
}

if [ "$MODE" = "frontend" ]; then
  render_nginx
  exec nginx -g 'daemon off;'
fi

if [ "$MODE" = "backend" ]; then
  start_backend
fi

render_nginx
python -m uvicorn main:app --host 0.0.0.0 --port "$UVICORN_PORT" &
exec nginx -g 'daemon off;'
