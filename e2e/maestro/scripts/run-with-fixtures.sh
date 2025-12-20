#!/bin/bash
# Script to run Maestro tests with fixtures
# Usage: ./e2e/maestro/scripts/run-with-fixtures.sh <test-file> [fixture-name]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Check if test file is provided
if [ -z "$1" ]; then
    echo "Error: Test file is required"
    echo ""
    echo "Usage: ./e2e/maestro/scripts/run-with-fixtures.sh <test-file> [fixture-name]"
    echo ""
    echo "Examples:"
    echo "  ./e2e/maestro/scripts/run-with-fixtures.sh e2e/maestro/tests/fixtures-onboarding.yaml"
    echo "  ./e2e/maestro/scripts/run-with-fixtures.sh e2e/maestro/tests/your-test.yaml with-tokens"
    echo ""
    exit 1
fi

TEST_FILE="$1"
FIXTURE_NAME="${2:-default}"

echo "🧹 Cleaning up old fixture server..."
pkill -f "fixture-loader.js" 2>/dev/null || true
sleep 1

echo "🚀 Starting fixture server with fixture: $FIXTURE_NAME"
node "$PROJECT_ROOT/e2e/maestro/scripts/fixture-loader.js" --action start --fixture "$FIXTURE_NAME" &
FIXTURE_PID=$!

# Ensure fixture server is killed when script exits (pass/fail/interrupt)
cleanup_fixture_server() {
    echo ""
    echo "🧹 Cleaning up fixture server..."
    if [ -n "$FIXTURE_PID" ] && kill -0 $FIXTURE_PID 2>/dev/null; then
        kill $FIXTURE_PID 2>/dev/null || true
    fi
    pkill -f "fixture-loader.js" 2>/dev/null || true
    echo "✅ Fixture server stopped"
}
trap cleanup_fixture_server EXIT

# Wait for fixture server to be ready
sleep 3

# Verify fixture server is running
if curl -s http://localhost:12345/state.json | head -c 100 > /dev/null; then
    echo "✅ Fixture server is running"
else
    echo "❌ Fixture server failed to start"
    exit 1
fi

echo "🔗 Setting up port forwarding..."
adb reverse tcp:12345 tcp:12345

echo "🧹 Clearing app data..."
adb shell pm clear io.metamask

echo "📱 Launching app..."
adb shell am start -W -n io.metamask/.MainActivity

echo "⏳ Waiting for app to load fixtures..."
sleep 10

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

# cleanup_fixture_server will be called automatically via trap
exit $TEST_EXIT_CODE

