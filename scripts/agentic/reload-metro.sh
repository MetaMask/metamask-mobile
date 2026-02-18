#!/bin/bash
# Reload all connected apps via Metro's WebSocket API.

set -euo pipefail

cd "$(dirname "$0")/../.."
[ -f .js.env ] && source .js.env

PORT="${WATCHER_PORT:-8081}"

# Verify Metro is running
if ! curl -sf "http://localhost:${PORT}/status" >/dev/null 2>&1; then
  echo "ERROR: Metro is not running on port $PORT."
  exit 1
fi

# Send reload via WebSocket
node -e "
  const ws = new (require('ws'))('ws://localhost:${PORT}/message');
  ws.on('open', () => {
    ws.send(JSON.stringify({ version: 2, method: 'reload' }));
    console.log('Reload sent to all connected apps.');
    ws.close();
  });
  ws.on('error', (e) => {
    console.error('WebSocket error:', e.message);
    process.exit(1);
  });
  setTimeout(() => { console.error('Timeout connecting to Metro.'); process.exit(1); }, 5000);
"
