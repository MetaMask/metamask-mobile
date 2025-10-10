#!/bin/bash

# Start Test Infrastructure for MetaMask Mobile Maestro Tests
# This script starts all required servers for the fixture-based test

echo "🚀 Starting MetaMask Mobile Test Infrastructure..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Check if Ganache is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is required but not installed"
    exit 1
fi

# Create logs directory
mkdir -p logs

echo "📡 Starting Comprehensive Mock Server (Port 8000)..."
node scripts/start-comprehensive-mock-server.js > logs/mock-server.log 2>&1 &
MOCK_PID=$!
echo "   Mock Server PID: $MOCK_PID"

echo "⛓️  Starting Ganache Local Blockchain (Port 8545)..."
node scripts/start-ganache.js > logs/ganache.log 2>&1 &
GANACHE_PID=$!
echo "   Ganache PID: $GANACHE_PID"

echo "🏗️  Starting Fixture Server (Port 12345)..."
node scripts/start-fixture-server.js > logs/fixture-server.log 2>&1 &
FIXTURE_PID=$!
echo "   Fixture Server PID: $FIXTURE_PID"

# Wait a moment for servers to start
echo "⏳ Waiting for servers to initialize..."
sleep 5

# Check if servers are running
echo "🔍 Checking server status..."

# Check Mock Server
if curl -s http://localhost:8000 > /dev/null; then
    echo "   ✅ Mock Server running on port 8000"
else
    echo "   ❌ Mock Server failed to start"
fi

# Check Ganache
if curl -s http://localhost:8545 > /dev/null; then
    echo "   ✅ Ganache running on port 8545"
else
    echo "   ❌ Ganache failed to start"
fi

# Check Fixture Server
if curl -s http://localhost:12345 > /dev/null; then
    echo "   ✅ Fixture Server running on port 12345"
else
    echo "   ❌ Fixture Server failed to start"
fi

echo ""
echo "🎉 Test infrastructure is ready!"
echo ""
echo "📋 Server Information:"
echo "   • Mock Server:    http://localhost:8000 (27 API endpoints)"
echo "   • Ganache:        http://localhost:8545 (Local blockchain)"
echo "   • Fixture Server: http://localhost:12345 (Wallet state)"
echo ""
echo "🧪 To run the test:"
echo "   maestro test metamask-swap-with-fixtures.yaml"
echo ""
echo "🛑 To stop all servers:"
echo "   node scripts/stop-all-servers.js"
echo ""
echo "📊 Server logs are available in the logs/ directory"

