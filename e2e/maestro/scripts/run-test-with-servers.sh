#!/bin/bash
# Run Maestro test with both fixture and mock servers
# Usage: ./e2e/maestro/scripts/run-test-with-servers.sh <test-file> [fixture-name] [mock-preset]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Check if test file is provided
if [ -z "$1" ]; then
    echo "Error: Test file is required"
    echo ""
    echo "Usage: ./e2e/maestro/scripts/run-test-with-servers.sh <test-file> [fixture-name] [mock-preset]"
    echo ""
    echo "Examples:"
    echo "  ./e2e/maestro/scripts/run-test-with-servers.sh e2e/maestro/tests/add-wallet-with-mocks.yaml"
    echo "  ./e2e/maestro/scripts/run-test-with-servers.sh e2e/maestro/tests/your-test.yaml with-tokens feature-flags"
    echo ""
    exit 1
fi

TEST_FILE="$1"
FIXTURE_NAME="${2:-default}"
MOCK_PRESET="${3:-feature-flags}"

echo "🔧 Running test with servers"
echo "   Test: $TEST_FILE"
echo "   Fixture: $FIXTURE_NAME"
echo "   Mock preset: $MOCK_PRESET"
echo ""

# Stop any existing servers
echo "🧹 Cleaning up existing servers..."
pkill -f "simple-fixture-server.js" 2>/dev/null || true
pkill -f "fixture-loader.js" 2>/dev/null || true
pkill -f "mock-server.js" 2>/dev/null || true
sleep 1

# Cleanup function
cleanup_servers() {
    echo ""
    echo "🧹 Cleaning up servers..."
    
    # Stop fixture server
    if [ -n "$FIXTURE_PID" ] && kill -0 $FIXTURE_PID 2>/dev/null; then
        kill $FIXTURE_PID 2>/dev/null || true
    fi
    pkill -f "simple-fixture-server.js" 2>/dev/null || true
    pkill -f "fixture-loader.js" 2>/dev/null || true
    
    # Stop mock server
    if [ -n "$MOCK_PID" ] && kill -0 $MOCK_PID 2>/dev/null; then
        kill $MOCK_PID 2>/dev/null || true
    fi
    pkill -f "mock-server.js" 2>/dev/null || true
    
    echo "✅ Servers stopped"
}
trap cleanup_servers EXIT

# Start fixture server (using simple-fixture-server.js which doesn't have ESM issues)
echo "🚀 Starting fixture server..."
node "$PROJECT_ROOT/e2e/maestro/scripts/simple-fixture-server.js" "$FIXTURE_NAME" &
FIXTURE_PID=$!
sleep 3

# Verify fixture server
if curl -s http://localhost:12345/state.json | head -c 100 > /dev/null; then
    echo "✅ Fixture server running (port 12345)"
else
    echo "❌ Fixture server failed to start"
    exit 1
fi

# Start mock server
echo "🚀 Starting mock server..."
node "$PROJECT_ROOT/e2e/maestro/scripts/mock-server.js" --action start --preset "$MOCK_PRESET" &
MOCK_PID=$!
sleep 2

# Verify mock server
if curl -s http://localhost:8000 > /dev/null 2>&1 || [ $? -eq 52 ]; then
    echo "✅ Mock server running (port 8000)"
else
    echo "❌ Mock server failed to start"
    exit 1
fi

# Setup emulator
echo ""
echo "🔗 Setting up port forwarding..."
adb reverse tcp:12345 tcp:12345  # Fixture server
adb reverse tcp:8000 tcp:8000    # Mock server
echo "✅ Port forwarding configured"

echo ""
echo "🧹 Clearing app data..."
adb shell pm clear io.metamask
echo "✅ App data cleared"

echo ""
echo "📱 Launching app..."
adb shell am start -W -n io.metamask/.MainActivity > /dev/null 2>&1
echo "✅ App launched"

echo ""
echo "⏳ Waiting for environment to stabilize..."
sleep 10

echo ""
echo "🧪 Running test: $TEST_FILE"
cd "$PROJECT_ROOT"
maestro test "$TEST_FILE"

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Test passed!"
else
    echo "❌ Test failed with exit code: $TEST_EXIT_CODE"
fi

# cleanup_servers will be called automatically via trap
exit $TEST_EXIT_CODE

