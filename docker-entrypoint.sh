#!/bin/sh
# Render sets PORT; Nakama's HTTP/WebSocket API must listen on that port.
# DATABASE_ADDRESS must match Nakama's format (see Render deploy notes in README).
set -e

if [ -z "$DATABASE_ADDRESS" ]; then
  echo "ERROR: DATABASE_ADDRESS is not set."
  echo "Set it in Render to your PostgreSQL internal connection string (user:pass@host:port/db)."
  exit 1
fi

PORT="${PORT:-7350}"

# Partial config so the main API/socket binds to Render's PORT (default 7350 locally).
cat > /tmp/socket-port.yml <<EOF
socket:
  port: ${PORT}
EOF

echo "Running database migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_ADDRESS"

echo "Starting Nakama (socket port ${PORT})..."
exec /nakama/nakama \
  --config /tmp/socket-port.yml \
  --database.address "$DATABASE_ADDRESS" \
  --logger.level "${NAKAMA_LOGGER_LEVEL:-info}" \
  --runtime.path /nakama/data/modules
