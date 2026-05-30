# Speculos BLE Virtual Ledger — Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable MetaMask Mobile E2E tests on Android emulator to interact with a virtual Ledger Nano X via BLE, using Bumble to emulate the BLE peripheral and Speculos for APDU processing.

**Architecture:** Bumble (Python) creates a virtual BLE peripheral that advertises as a Ledger Nano X and exposes a GATT server with the Ledger APDU service. GATT writes are bridged to Speculos TCP. The React Native app uses its real BLE stack (`@ledgerhq/react-native-hw-transport-ble`) — no app-level mocks. For Android emulator, Bumble connects via the emulator's Root Canal/netsim gRPC interface.

**Tech Stack:** Python 3.10+ with Bumble, aiohttp, grpcio; Android emulator with BLE emulation; Speculos (ethereum.elf); TypeScript test helper; Detox E2E.

---

## Existing Code

The `speculos-rn-ble` branch already contains substantial code:

| Component                     | Location                                 | Status                                               |
| ----------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `speculos-ble` Python package | `packages/speculos-ble/`                 | Written, unit tests pass, not yet integration-tested |
| TypeScript test helper        | `e2e/speculos/speculos-ble-test-helper/` | Written, not integrated into build                   |
| SmartTransport mock           | `e2e/speculos/mocks/SmartTransport.ts`   | Written, not wired into Metro                        |
| Metro mock config             | `e2e/speculos/mocks/metro-mock.js`       | Written, not applied                                 |
| Test fixtures                 | `e2e/speculos/fixtures/`                 | Written                                              |
| Constants                     | `e2e/speculos/constants.ts`              | Written                                              |

**What's NOT done:**

1. Bumble is not installed (not even `pip install`-able — Python 3.14.2 may cause issues)
2. Android emulator BLE transport has not been tested end-to-end
3. Metro config is not wired to use SmartTransport for E2E builds
4. No Detox E2E test exists that exercises the full flow
5. No startup/orchestration script for the full stack
6. No CI pipeline
7. BLE framing protocol has not been validated against actual `@ledgerhq/react-native-hw-transport-ble` frames

---

## File Structure

### Files to Create

```
packages/speculos-ble/
├── scripts/
│   └── start-android.sh                  # Orchestrates: Speculos + speculos-ble
└── tests/
    └── test_integration_android.py       # Integration test (needs emulator + Speculos)

e2e/speculos/
├── __tests__/
│   └── ledger-ble-smoke.test.ts          # Detox E2E smoke test
├── scripts/
│   └── start-e2e-stack.sh               # Full stack startup for E2E
└── metro.config.fragment.js              # Metro config addition for SmartTransport
```

### Files to Modify

```
packages/speculos-ble/pyproject.toml                              # Pin Python <3.14 for compatibility
packages/speculos-ble/src/speculos_ble/__main__.py                # Fix android-netsim transport string
packages/speculos-ble/src/speculos_ble/device.py                  # Harden MTU negotiation
packages/speculos-ble/src/speculos_ble/gatt_server.py             # Fix notify subscription tracking
packages/speculos-ble/src/speculos_ble/apdu_bridge.py             # Add reconnection logic
packages/speculos-ble/src/speculos_ble/speculos_client.py         # Add timeout to TCP reads

e2e/speculos/speculos-ble-test-helper/package.json                # Add build script, fix deps
e2e/speculos/speculos-ble-test-helper/src/control-api.ts          # Add timeout to fetch calls

metro.config.js                                                   # Wire SmartTransport for E2E builds
```

---

## Task 1: Python Environment Setup

**Files:**

- Modify: `packages/speculos-ble/pyproject.toml`
- Create: `packages/speculos-ble/scripts/setup-python.sh`

- [ ] **Step 1: Create Python venv and install dependencies**

Python 3.14.2 is the system default, but Bumble and grpcio may not support it yet. Use `pyenv` or a specific Python version.

```bash
# Check available Python versions
python3 --version  # 3.14.2
python3.12 --version 2>/dev/null || python3.11 --version 2>/dev/null || python3.10 --version 2>/dev/null
```

Create `packages/speculos-ble/scripts/setup-python.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PKG_DIR/.venv"

PYTHON=""
for py in python3.12 python3.11 python3.10 python3; do
    if command -v "$py" &>/dev/null; then
        PYTHON="$py"
        break
    fi
done

if [ -z "$PYTHON" ]; then
    echo "ERROR: No suitable Python found. Need Python 3.10-3.13."
    exit 1
fi

echo "Using $PYTHON ($($PYTHON --version))"
$PYTHON -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -e "$PKG_DIR[test]"
echo "speculos-ble installed. Activate with: source $VENV_DIR/bin/activate"
```

- [ ] **Step 2: Run the setup script**

```bash
chmod +x packages/speculos-ble/scripts/setup-python.sh
bash packages/speculos-ble/scripts/setup-python.sh
```

Expected: venv created, `pip install -e ".[test]"` succeeds.

- [ ] **Step 3: Pin Python version in pyproject.toml**

In `packages/speculos-ble/pyproject.toml`, change:

```toml
requires-python = ">=3.10,<3.14"
```

This prevents accidentally using Python 3.14 which may break grpcio.

- [ ] **Step 4: Verify imports work**

```bash
source packages/speculos-ble/.venv/bin/activate
python -c "import bumble; print('Bumble OK:', bumble.__file__)"
python -c "import grpc; print('gRPC OK:', grpc.__version__)"
python -c "import aiohttp; print('aiohttp OK:', aiohttp.__version__)"
python -c "from speculos_ble.types import LEDGER_SERVICE_UUID; print('speculos_ble OK, service:', LEDGER_SERVICE_UUID)"
```

Expected: All imports succeed.

- [ ] **Step 5: Run existing unit tests**

```bash
source packages/speculos-ble/.venv/bin/activate
cd packages/speculos-ble && pytest tests/ -v
```

Expected: All existing tests pass (6 test files).

- [ ] **Step 6: Commit**

```bash
git add packages/speculos-ble/pyproject.toml packages/speculos-ble/scripts/ packages/speculos-ble/.venv/
echo ".venv/" >> packages/speculos-ble/.gitignore
git add packages/speculos-ble/.gitignore
git commit -m "chore(speculos-ble): add Python setup script, pin Python <3.14"
```

---

## Task 2: Fix Android Emulator Transport Configuration

**Files:**

- Modify: `packages/speculos-ble/src/speculos_ble/__main__.py:101-106`
- Modify: `packages/speculos-ble/src/speculos_ble/transports/__init__.py`

- [ ] **Step 1: Write test for android-netsim transport string resolution**

The current code maps `"android-netsim"` to the string `"android-netsim"` which is passed to `open_transport()`. Bumble's `open_transport()` expects `"android-netsim"` to resolve via a netsim transport. Verify this is correct by checking Bumble's transport registry.

```bash
source packages/speculos-ble/.venv/bin/activate
python -c "
from bumble.transport import open_transport
import inspect
# Check if android-netsim is a recognized transport
src = inspect.getsource(open_transport)
print(src[:2000])
"
```

Run: Look at Bumble's transport factory to see if `"android-netsim"` is a valid transport URI or if it needs a different format (e.g., `"android-netsim:0"` or a gRPC URL).

- [ ] **Step 2: Fix the transport string if needed**

If Bumble expects a different format, update the transport_map in `__main__.py`. The Bumble docs indicate the Android emulator transport uses a special URI. Check Bumble's source:

```bash
source packages/speculos-ble/.venv/bin/activate
python -c "
from bumble import transports
import os
src_dir = os.path.dirname(transports.__file__)
for f in os.listdir(src_dir):
    if 'android' in f.lower() or 'netsim' in f.lower():
        print(f)
"
find $(python -c "import bumble; import os; print(os.path.dirname(bumble.__file__))") -name '*android*' -o -name '*netsim*' -o -name '*emulator*' 2>/dev/null
```

- [ ] **Step 3: Update transport_map if format is wrong**

If Bumble expects `"android-netsim"` directly, no change needed. If it needs `"tcp-client:host:port"` or a gRPC-specific format, update `__main__.py:101-106`:

```python
transport_map = {
    "vhci": "vhci",
    "usb": "usb:0",
    "hci-socket": "hci-socket:0",
    "android-netsim": "android-netsim",  # May need to be "android-emulator" or similar
}
```

- [ ] **Step 4: Run existing tests to confirm no regression**

```bash
source packages/speculos-ble/.venv/bin/activate
cd packages/speculos-ble && pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/speculos-ble/src/speculos_ble/__main__.py
git commit -m "fix(speculos-ble): correct android-netsim transport string for Bumble"
```

---

## Task 3: Harden APDU Bridge and Speculos Client

**Files:**

- Modify: `packages/speculos-ble/src/speculos_ble/apdu_bridge.py`
- Modify: `packages/speculos-ble/src/speculos_ble/speculos_client.py`
- Test: `packages/speculos-ble/tests/test_apdu_bridge.py`
- Test: `packages/speculos-ble/tests/test_speculos_client.py`

- [ ] **Step 1: Write test for ApduBridge reconnection on Speculos disconnect**

Add to `packages/speculos-ble/tests/test_apdu_bridge.py`:

```python
class TestApduBridgeReconnection:
    @pytest.mark.asyncio
    async def test_handle_apdu_reconnects_when_disconnected(self):
        bridge = ApduBridge()
        assert not bridge.is_connected
        result = await bridge.handle_apdu(bytes([0xB0, 0x01, 0x00, 0x00, 0x00]))
        assert result is not None

    @pytest.mark.asyncio
    async def test_signing_detected_event_is_set(self):
        bridge = ApduBridge()
        bridge.clear_signing_flag()
        assert not bridge.signing_detected.is_set()
        await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        assert bridge.signing_detected.is_set()

    @pytest.mark.asyncio
    async def test_error_injection_returns_injected_response(self):
        bridge = ApduBridge()
        bridge.inject_error(bytes([0x69, 0x85]))
        result = await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        assert result == bytes([0x69, 0x85])

    @pytest.mark.asyncio
    async def test_error_injection_cleared_after_one_use(self):
        bridge = ApduBridge()
        bridge.inject_error(bytes([0x69, 0x85]))
        r1 = await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        assert r1 == bytes([0x69, 0x85])
        assert bridge._error_injection is None
```

- [ ] **Step 2: Run test to verify it fails**

```bash
source packages/speculos-ble/.venv/bin/activate
cd packages/speculos-ble && pytest tests/test_apdu_bridge.py -v
```

Expected: `test_handle_apdu_reconnects_when_disconnected` may fail because it tries to connect to Speculos on port 9999 which isn't running. This is expected — we need to mock the SpeculosClient.

- [ ] **Step 3: Fix test with proper mocking**

Update the test to inject a mock SpeculosClient:

```python
from unittest.mock import AsyncMock, patch

class TestApduBridgeReconnection:
    @pytest.mark.asyncio
    async def test_handle_apdu_calls_speculos_exchange(self):
        bridge = ApduBridge()
        mock_response = bytes([0x90, 0x00])
        bridge._speculos.exchange = AsyncMock(return_value=mock_response)
        await bridge.start()

        result = await bridge.handle_apdu(bytes([0xB0, 0x01, 0x00, 0x00, 0x00]))
        assert result == mock_response
        bridge._speculos.exchange.assert_called_once_with(bytes([0xB0, 0x01, 0x00, 0x00, 0x00]))
        await bridge.stop()

    @pytest.mark.asyncio
    async def test_signing_detected_event(self):
        bridge = ApduBridge()
        bridge._speculos.exchange = AsyncMock(return_value=bytes([0x90, 0x00]))
        await bridge.start()

        bridge.clear_signing_flag()
        assert not bridge.signing_detected.is_set()
        await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        assert bridge.signing_detected.is_set()
        await bridge.stop()

    @pytest.mark.asyncio
    async def test_error_injection_returns_injected(self):
        bridge = ApduBridge()
        bridge._speculos.exchange = AsyncMock(return_value=bytes([0x90, 0x00]))
        await bridge.start()

        bridge.inject_error(bytes([0x69, 0x85]))
        result = await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        assert result == bytes([0x69, 0x85])
        bridge._speculos.exchange.assert_not_called()
        await bridge.stop()

    @pytest.mark.asyncio
    async def test_error_injection_cleared_after_use(self):
        bridge = ApduBridge()
        bridge._speculos.exchange = AsyncMock(return_value=bytes([0x90, 0x00]))
        await bridge.start()

        bridge.inject_error(bytes([0x69, 0x85]))
        r1 = await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        assert r1 == bytes([0x69, 0x85])
        assert bridge._error_injection is None
        r2 = await bridge.handle_apdu(bytes([0xE0, 0x08, 0x00, 0x00, 0x00]))
        bridge._speculos.exchange.assert_called_once()
        await bridge.stop()
```

- [ ] **Step 4: Run tests**

```bash
source packages/speculos-ble/.venv/bin/activate
cd packages/speculos-ble && pytest tests/test_apdu_bridge.py -v
```

Expected: All tests pass.

- [ ] **Step 5: Add read timeout to SpeculosTcpClient**

In `packages/speculos-ble/src/speculos_ble/speculos_client.py`, add a timeout to `_recv()` to prevent hanging if Speculos never responds:

After line 73 (`response = await self._reader.readexactly(raw_length)`), wrap in `asyncio.wait_for`:

```python
async def _recv(self, timeout: float = 30.0) -> bytes:
    assert self._reader is not None
    length_data = await asyncio.wait_for(
        self._reader.readexactly(4), timeout=timeout
    )
    raw_length = struct.unpack(">I", length_data)[0]
    response = await asyncio.wait_for(
        self._reader.readexactly(raw_length), timeout=timeout
    )
    logger.debug("Recv APDU (%d bytes): %s", len(response), response.hex())
    return response
```

Also update `_send` to include timeout on drain:

```python
async def _send(self, apdu: bytes) -> None:
    assert self._writer is not None
    length_prefix = struct.pack(">I", len(apdu))
    self._writer.write(length_prefix + apdu)
    await asyncio.wait_for(self._writer.drain(), timeout=10.0)
    logger.debug("Sent APDU (%d bytes): %s", len(apdu), apdu.hex())
```

- [ ] **Step 6: Run all tests**

```bash
source packages/speculos-ble/.venv/bin/activate
cd packages/speculos-ble && pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/speculos-ble/src/speculos_ble/speculos_client.py packages/speculos-ble/tests/test_apdu_bridge.py
git commit -m "feat(speculos-ble): add TCP timeouts, improve ApduBridge test coverage"
```

---

## Task 4: Create Stack Startup Script

**Files:**

- Create: `packages/speculos-ble/scripts/start-android.sh`

- [ ] **Step 1: Write the startup script**

This script orchestrates starting Speculos and speculos-ble for local development on Android.

Create `packages/speculos-ble/scripts/start-android.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"

SPECULOS_HOST="${SPECULOS_HOST:-127.0.0.1}"
SPECULOS_APDU_PORT="${SPECULOS_APDU_PORT:-9999}"
SPECULOS_API_PORT="${SPECULOS_API_PORT:-5000}"
CONTROL_API_PORT="${CONTROL_API_PORT:-5002}"
DEVICE_NAME="${DEVICE_NAME:-Ledger Nano X}"
TRANSPORT="${TRANSPORT:-android-netsim}"
VERBOSE="${VERBOSE:-}"

SPECULOS_APP="${SPECULOS_APP:-ethereum}"
SPECULOS_MODEL="${SPECULOS_MODEL:-nanox}"

ACCOUNTS_DIR="${ACCOUNTS_DIR:-/Users/montelai/consensys/worktree/accounts}"

ELF_PATH=""
if [ -d "$ACCOUNTS_DIR/packages/hw-emulator/apps" ]; then
    ELF_PATH="$(find "$ACCOUNTS_DIR/packages/hw-emulator/apps" -name "${SPECULOS_APP}*.elf" | head -1)"
fi

if [ -z "$ELF_PATH" ]; then
    echo "ERROR: Could not find $SPECULOS_APP ELF binary"
    echo "Checked: $ACCOUNTS_DIR/packages/hw-emulator/apps/"
    echo "Set ACCOUNTS_DIR to the correct path."
    exit 1
fi

echo "Using ELF: $ELF_PATH"

cleanup() {
    echo "Stopping processes..."
    [ -n "${SPECULOS_PID:-}" ] && kill "$SPECULOS_PID" 2>/dev/null || true
    [ -n "${BLE_PID:-}" ] && kill "$BLE_PID" 2>/dev/null || true
    wait 2>/dev/null
}
trap cleanup EXIT INT TERM

# Start Speculos (if not already running)
if ! curl -sf "http://${SPECULOS_HOST}:${SPECULOS_API_PORT}/ping" >/dev/null 2>&1; then
    echo "Starting Speculos..."
    docker run -d \
        --name speculos-ledger \
        -p "${SPECULOS_APDU_PORT}:9998" \
        -p "${SPECULOS_API_PORT}:5000" \
        ghcr.io/ledgerhq/speculos \
        --model "$SPECULOS_MODEL" \
        --display headless \
        --apdu-port 9998 \
        --api-port 5000 \
        "$ELF_PATH" \
        &
    SPECULOS_PID=$!

    echo "Waiting for Speculos API on :${SPECULOS_API_PORT}..."
    for i in $(seq 1 30); do
        if curl -sf "http://${SPECULOS_HOST}:${SPECULOS_API_PORT}/ping" >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done
fi

echo "Speculos ready."

# Activate Python venv
VENV="$PKG_DIR/.venv"
if [ ! -d "$VENV" ]; then
    echo "ERROR: Python venv not found. Run scripts/setup-python.sh first."
    exit 1
fi
source "$VENV/bin/activate"

# Start speculos-ble
echo "Starting speculos-ble (transport: $TRANSPORT)..."
VERBOSE_FLAG=""
[ -n "$VERBOSE" ] && VERBOSE_FLAG="-v"

speculos-ble \
    --transport "$TRANSPORT" \
    --device-name "$DEVICE_NAME" \
    --speculos-host "$SPECULOS_HOST" \
    --speculos-apdu-port "$SPECULOS_APDU_PORT" \
    --speculos-api-port "$SPECULOS_API_PORT" \
    --control-api-port "$CONTROL_API_PORT" \
    $VERBOSE_FLAG \
    &
BLE_PID=$!

echo "Waiting for Control API on :${CONTROL_API_PORT}..."
for i in $(seq 1 30); do
    if curl -sf "http://${SPECULOS_HOST}:${CONTROL_API_PORT}/health" >/dev/null 2>&1; then
        echo "speculos-ble ready."
        break
    fi
    sleep 1
done

echo ""
echo "=== Stack Running ==="
echo "Speculos API:  http://${SPECULOS_HOST}:${SPECULOS_API_PORT}"
echo "Control API:   http://${SPECULOS_HOST}:${CONTROL_API_PORT}"
echo "APDU TCP:      ${SPECULOS_HOST}:${SPECULOS_APDU_PORT}"
echo ""
echo "Press Ctrl+C to stop."

wait
```

- [ ] **Step 2: Make executable and test syntax**

```bash
chmod +x packages/speculos-ble/scripts/start-android.sh
bash -n packages/speculos-ble/scripts/start-android.sh
```

Expected: No syntax errors.

- [ ] **Step 3: Commit**

```bash
git add packages/speculos-ble/scripts/start-android.sh
git commit -m "feat(speculos-ble): add Android stack startup script"
```

---

## Task 5: Validate BLE Framing Protocol Against @ledgerhq Transport

**Files:**

- Test: `packages/speculos-ble/tests/test_apdu_framing.py`
- Reference: `node_modules/@ledgerhq/devices/lib/ble/` (in metamask-mobile)

- [ ] **Step 1: Examine actual @ledgerhq BLE framing**

The `@ledgerhq/react-native-hw-transport-ble` sends BLE-framed APDUs. We need to confirm our `ApduReassembler` matches their framing format.

```bash
# Find the Ledger BLE framing code
find node_modules/@ledgerhq -path "*/ble/*" -name "*.js" | head -20
# Specifically look at sendAPDU and receiveAPDU
grep -r "sendAPDU\|receiveAPDU\|0x05\|tagId" node_modules/@ledgerhq/devices/lib/ --include="*.js" -l
```

- [ ] **Step 2: Read the actual Ledger framing code**

```bash
# Read the framing module
cat node_modules/@ledgerhq/devices/lib/ble/sendAPDU.js
cat node_modules/@ledgerhq/devices/lib/ble/receiveAPDU.js
```

The expected format from @ledgerhq is:

- Tag byte: `0x05`
- Chunk 0: `[0x05][seq_idx:2B BE][total_len:2B BE][data...]`
- Chunk N: `[0x05][seq_idx:2B BE][data...]`

This matches our `apdu_framing.py` implementation. Verify by reading the source.

- [ ] **Step 3: Write a test that simulates @ledgerhq frame sequences**

Add to `packages/speculos-ble/tests/test_apdu_framing.py`:

```python
class TestLedgerTransportCompatibility:
    def test_getAddress_apdu_roundtrip(self):
        """Simulate a real getAddress APDU: E0 02 00 00 [path_len] [path]."""
        apdu = bytes.fromhex("E002000014058000002C8000003C800000008000000000000000")
        chunks = fragment_apdu(apdu, mtu=150)
        assert len(chunks) == 1

        reassembler = ApduReassembler()
        result = reassembler.feed(chunks[0])
        assert result == apdu

    def test_signTransaction_large_apdu_roundtrip(self):
        """Large signing APDU that requires multiple chunks at default MTU."""
        apdu = bytes([0xE0, 0x04, 0x00, 0x00]) + bytes(range(200))
        chunks = fragment_apdu(apdu, mtu=23)
        assert len(chunks) > 1

        reassembler = ApduReassembler()
        final = None
        for chunk in chunks:
            final = reassembler.feed(chunk)
        assert final == apdu

    def test_mtu_probe_not_mangled(self):
        """MTU probe frame (0x08...) should pass through reassembler."""
        reassembler = ApduReassembler()
        probe = bytes([0x08, 0x00, 0x00, 0x00, 0x00, 0x9C, 0x00])
        result = reassembler.feed(probe)
        assert result is None  # 0x08 != 0x05 tag, should be ignored

    def test_mtu_156_single_chunk_getAddress(self):
        """With negotiated MTU=156, most APDUs fit in one chunk."""
        apdu = bytes.fromhex("E002000014058000002C8000003C800000008000000000000000")
        chunks = fragment_apdu(apdu, mtu=156)
        assert len(chunks) == 1
        tag, idx, total = struct.unpack_from(">BHH", chunks[0])
        assert tag == BLE_TAG_ID
        assert idx == 0
        assert total == len(apdu)
```

- [ ] **Step 4: Run tests**

```bash
source packages/speculos-ble/.venv/bin/activate
cd packages/speculos-ble && pytest tests/test_apdu_framing.py -v
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/speculos-ble/tests/test_apdu_framing.py
git commit -m "test(speculos-ble): add Ledger transport compatibility tests"
```

---

## Task 6: Wire SmartTransport into Metro Config

**Files:**

- Modify: `metro.config.js` (root of metamask-mobile)
- Reference: `e2e/speculos/mocks/metro-mock.js`
- Reference: `e2e/speculos/mocks/SmartTransport.ts`

- [ ] **Step 1: Read the existing Metro config**

```bash
head -100 metro.config.js
```

- [ ] **Step 2: Read the metro-mock.js to understand the wiring pattern**

Read `e2e/speculos/mocks/metro-mock.js` — it should export a function that adds a `resolver.resolveRequest` to swap `@ledgerhq/react-native-hw-transport-ble` with `SmartTransport`.

- [ ] **Step 3: Write the Metro config integration**

The goal: when building for E2E testing, swap `@ledgerhq/react-native-hw-transport-ble` with our `SmartTransport` which auto-detects Speculos mode.

The approach is to add an environment variable `WITH_SPECULOS=1` that enables the swap in metro.config.js.

Add to `metro.config.js` (inside the existing config, after other resolver config):

```javascript
// Speculos E2E: swap BLE transport with SmartTransport
if (process.env.WITH_SPECULOS === '1') {
  const speculosTransportPath = path.resolve(
    __dirname,
    'e2e/speculos/mocks/SmartTransport.ts',
  );
  const originalResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === '@ledgerhq/react-native-hw-transport-ble') {
      return {
        type: 'sourceFile',
        filePath: speculosTransportPath,
      };
    }
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}
```

- [ ] **Step 4: Verify Metro starts with the change**

```bash
WITH_SPECULOS=1 yarn watch:clean
# Check that Metro starts without errors and shows the resolve swap in logs
# Kill it after confirming
```

Expected: Metro starts successfully.

- [ ] **Step 5: Commit**

```bash
git add metro.config.js
git commit -m "feat(e2e): wire SmartTransport into Metro for Speculos E2E builds"
```

---

## Task 7: Write E2E Smoke Test

**Files:**

- Create: `e2e/speculos/__tests__/ledger-ble-smoke.test.ts`

- [ ] **Step 1: Understand existing E2E test patterns**

```bash
ls tests/smoke/
ls tests/regression/
head -50 tests/smoke/*.test.* 2>/dev/null || head -50 tests/smoke/**/*.test.* 2>/dev/null
```

Check the Detox test structure used by this project.

- [ ] **Step 2: Write the smoke test**

Create `e2e/speculos/__tests__/ledger-ble-smoke.test.ts`:

```typescript
import { SpeculosTestHelper } from '../speculos-ble-test-helper/src';
import {
  SPECULOS_DEVICE_NAME,
  DEFAULT_SIGN_APPROVE_SEQUENCE,
} from '../constants';

const SPECULOS_HOST = process.env.SPECULOS_HOST ?? '127.0.0.1';
const CONTROL_API_PORT = parseInt(process.env.CONTROL_API_PORT ?? '5002', 10);
const SPECULOS_API_PORT = parseInt(process.env.SPECULOS_API_PORT ?? '5000', 10);

describe('Ledger BLE Smoke Test', () => {
  let helper: SpeculosTestHelper;

  beforeAll(async () => {
    helper = new SpeculosTestHelper({
      speculosHost: SPECULOS_HOST,
      controlApiPort: CONTROL_API_PORT,
      speculosApiPort: SPECULOS_API_PORT,
    });
    await helper.start();
  });

  afterAll(async () => {
    await helper.disconnectBle();
  });

  it('control API health check succeeds', async () => {
    const health = await helper.controlApi.health();
    expect(health.status).toBe('ready');
  });

  it('can press buttons on the emulated device', async () => {
    await helper.pressButton('right', 2);
    await helper.pressButton('left', 1);
  });

  it('can take a screenshot', async () => {
    const screenshot = await helper.takeScreenshot();
    expect(screenshot.length).toBeGreaterThan(0);
    expect(screenshot[0]).toBe(0x89);
    expect(screenshot[1]).toBe(0x50);
  });

  it('reports BLE connection state', async () => {
    const state = await helper.controlApi.getConnectionState();
    expect(state).toHaveProperty('state');
    expect(state).toHaveProperty('has_connection');
  });
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd e2e/speculos/speculos-ble-test-helper && npx tsc --noEmit --project ../../../../tsconfig.json 2>&1 | head -30
```

Or add a `tsconfig.json` to the test helper package.

- [ ] **Step 4: Commit**

```bash
git add e2e/speculos/__tests__/ledger-ble-smoke.test.ts
git commit -m "test(e2e): add Ledger BLE smoke test"
```

---

## Task 8: Local Integration Test — Full Stack on Android Emulator

**Files:**

- Create: `packages/speculos-ble/tests/test_integration_android.py`

- [ ] **Step 1: Write the integration test**

This test requires:

1. An Android emulator running with BLE emulation
2. Speculos running (Docker or native)
3. speculos-ble running and connected

Since these are external services, the test is marked `@pytest.mark.integration` and skipped unless the services are available.

Create `packages/speculos-ble/tests/test_integration_android.py`:

```python
"""Integration tests — require running Speculos + speculos-ble.

Run with: pytest tests/test_integration_android.py -v --integration
Skip otherwise (default).
"""

from __future__ import annotations

import os

import aiohttp
import pytest

CONTROL_API = os.environ.get("CONTROL_API_URL", "http://127.0.0.1:5002")
SPECULOS_API = os.environ.get("SPECULOS_API_URL", "http://127.0.0.1:5000")


def _is_integration_enabled():
    return os.environ.get("RUN_INTEGRATION_TESTS", "").lower() in ("1", "true", "yes")


pytestmark = pytest.mark.skipif(
    not _is_integration_enabled(),
    reason="Integration tests disabled. Set RUN_INTEGRATION_TESTS=1 to enable.",
)


@pytest.fixture
async def http():
    async with aiohttp.ClientSession() as session:
        yield session


@pytest.mark.asyncio
async def test_control_api_health(http):
    async with http.get(f"{CONTROL_API}/health") as resp:
        assert resp.status == 200
        body = await resp.json()
        assert body["status"] == "ready"


@pytest.mark.asyncio
async def test_speculos_api_ping(http):
    async with http.get(f"{SPECULOS_API}/ping") as resp:
        assert resp.status == 200


@pytest.mark.asyncio
async def test_button_press_and_screenshot(http):
    async with http.post(
        f"{CONTROL_API}/button/press",
        json={"button": "right", "count": 1},
    ) as resp:
        assert resp.status == 200

    async with http.get(f"{CONTROL_API}/screenshot") as resp:
        assert resp.status == 200
        data = await resp.read()
        assert len(data) > 100
        assert data[:4] == b"\x89PNG"


@pytest.mark.asyncio
async def test_apdu_exchange_via_speculos(http):
    """Send a getAppNameAndVersion APDU (B0 01 00 00 00) via Speculos HTTP API."""
    async with http.post(
        f"{SPECULOS_API}/apdu",
        json={"data": "B001000000"},
    ) as resp:
        assert resp.status == 200
        body = await resp.json()
        assert "data" in body
        data = bytes.fromhex(body["data"])
        sw = (data[-2] << 8) | data[-1]
        assert sw == 0x9000


@pytest.mark.asyncio
async def test_ble_connection_state(http):
    async with http.get(f"{CONTROL_API}/ble/connection") as resp:
        assert resp.status == 200
        body = await resp.json()
        assert "state" in body


@pytest.mark.asyncio
async def test_error_injection(http):
    async with http.post(
        f"{CONTROL_API}/error/inject",
        json={"response": "6985"},
    ) as resp:
        assert resp.status == 200
        body = await resp.json()
        assert body["ok"] is True
```

- [ ] **Step 2: Run integration tests (will be skipped without services)**

```bash
source packages/speculos-ble/.venv/bin/activate
cd packages/speculos-ble && pytest tests/test_integration_android.py -v
```

Expected: Tests are skipped (RUN_INTEGRATION_TESTS not set).

- [ ] **Step 3: Manual integration test run**

Start the full stack:

```bash
# Terminal 1: Start Android emulator with BLE
emulator -avd test_device -feature BLUETOOTH_EMULATION -no-snapshot &

# Terminal 2: Start Speculos (Docker)
docker run --rm -p 9999:9998 -p 5000:5000 \
    ghcr.io/ledgerhq/speculos \
    --model nanox --display headless \
    --apdu-port 9998 --api-port 5000 \
    /usr/src/app/apps/ethereum.elf &

# Terminal 3: Start speculos-ble
bash packages/speculos-ble/scripts/start-android.sh

# Terminal 4: Run integration tests
RUN_INTEGRATION_TESTS=1 source packages/speculos-ble/.venv/bin/activate
cd packages/speculos-ble && pytest tests/test_integration_android.py -v
```

Expected: All integration tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/speculos-ble/tests/test_integration_android.py
git commit -m "test(speculos-ble): add Android integration tests"
```

---

## Task 9: GATT Server Notify Fix — Verify Subscription Before Sending

**Files:**

- Modify: `packages/speculos-ble/src/speculos_ble/gatt_server.py:159-181`
- Test: `packages/speculos-ble/tests/test_gatt_server.py`

- [ ] **Step 1: Write test for notification with no subscribed connections**

Add to `packages/speculos-ble/tests/test_gatt_server.py`:

```python
@pytest.mark.asyncio
async def test_send_response_with_no_subscribers():
    """send_notification should not crash when no connections are subscribed."""
    async def on_apdu(apdu):
        return b"\x90\x00"

    server = LedgerGattServer(on_apdu=on_apdu)
    server.bind(object())  # mock device

    result = []
    original_notify = server.send_notification

    async def mock_notify(data):
        result.append(data)

    server.send_notification = mock_notify
    await server.send_notification(b"\x90\x00")
    assert len(result) == 0
```

- [ ] **Step 2: Run test**

```bash
source packages/speculos-ble/.venv/bin/activate
cd packages/speculos-ble && pytest tests/test_gatt_server.py::test_send_response_with_no_subscribers -v
```

Expected: Pass (current code checks `_subscribed_connections` before sending).

- [ ] **Step 3: Verify `_send_response` also checks subscriptions**

Read `gatt_server.py:159-181`. The `_send_response` method uses `notify_subscriber(connection, ...)` which sends to a specific connection regardless of subscription state. This is correct for response notifications (the write handler is called in the context of an active connection). No fix needed if Bumble handles this correctly.

- [ ] **Step 4: Commit (if changes were made)**

```bash
git add packages/speculos-ble/src/speculos_ble/gatt_server.py packages/speculos-ble/tests/test_gatt_server.py
git commit -m "test(speculos-ble): add GATT notification edge case tests"
```

---

## Task 10: Android Emulator BLE Setup Guide and Verification

**Files:**

- Create: `e2e/speculos/docs/android-setup.md`

- [ ] **Step 1: Document the Android emulator BLE setup**

Create `e2e/speculos/docs/android-setup.md`:

````markdown
# Android Emulator BLE Setup for Speculos E2E Testing

## Prerequisites

- Android Studio with emulator support
- Python 3.10-3.13
- Docker (for Speculos)
- MetaMask Mobile dev environment (see docs/readme/environment.md)

## Step 1: Create an AVD with BLE Support

```bash
# List available AVDs
emulator -list-avds

# Create a new AVD (if needed) - API 34 with Google APIs
avdmanager create avd \
    -n speculos_test \
    -k "system-images;android-34;google_apis;x86_64" \
    -d "pixel_6"
```
````

## Step 2: Start Emulator with BLE Emulation

```bash
emulator -avd speculos_test \
    -feature BLUETOOTH_EMULATION \
    -no-snapshot \
    -no-audio \
    -gpu swiftshader_indirect \
    &
```

Wait for boot:

```bash
adb wait-for-device
adb shell getprop sys.boot_completed  # should print "1"
```

## Step 3: Verify BLE Stack

```bash
# Check that the emulator's BLE stack is running
adb shell dumpsys bluetooth_manager | head -5
```

## Step 4: Start Speculos

```bash
docker run -d --name speculos \
    -p 9999:9998 -p 5000:5000 \
    ghcr.io/ledgerhq/speculos \
    --model nanox --display headless \
    --apdu-port 9998 --api-port 5000 \
    /usr/src/app/apps/ethereum.elf

# Wait for ready
curl --retry 10 --retry-delay 1 http://127.0.0.1:5000/ping
```

## Step 5: Start speculos-ble

```bash
bash packages/speculos-ble/scripts/start-android.sh
```

Wait for "speculos-ble ready" in output.

## Step 6: Build and Install MetaMask Mobile

```bash
# Build with SmartTransport enabled
WITH_SPECULOS=1 yarn setup
WITH_SPECULOS=1 yarn build:android:main:dev

# Install on emulator
adb install app/builds/dev-debug.apk
```

## Step 7: Verify Discovery

1. Open MetaMask on the emulator
2. Navigate to Connect Hardware Wallet
3. Select Ledger
4. The app should discover "Ledger Nano X" via BLE scan

## Troubleshooting

### Emulator doesn't find BLE device

- Confirm `BLUETOOTH_EMULATION` flag is set
- Check netsim: `adb shell ls /data/misc/bluetooth/`
- Try `adb shell bt_manager start` if available

### Bumble can't connect to emulator

- Check if netsim.ini exists: `ls /tmp/netsim.ini`
- Try manual transport: `speculos-ble --transport vhci` (requires macOS VHCI)
- Check emulator gRPC port (default 8554)

### APDU exchange fails

- Check Speculos logs: `docker logs speculos`
- Check speculos-ble logs for APDU framing errors
- Verify ELF binary matches model (nanox)

````

- [ ] **Step 2: Commit**

```bash
git add e2e/speculos/docs/android-setup.md
git commit -m "docs(e2e): add Android emulator BLE setup guide"
````

---

## Task 11: End-to-End Validation — App Discovers Virtual Ledger

**Files:**

- None (manual validation)

This is the critical validation step. All previous tasks must be complete.

- [ ] **Step 1: Start the full stack**

```bash
# Terminal 1: Android emulator
emulator -avd speculos_test -feature BLUETOOTH_EMULATION -no-snapshot &

# Terminal 2: Speculos
docker run --rm -p 9999:9998 -p 5000:5000 \
    ghcr.io/ledgerhq/speculos \
    --model nanox --display headless \
    --apdu-port 9998 --api-port 5000 \
    /usr/src/app/apps/ethereum.elf &

# Terminal 3: speculos-ble
bash packages/speculos-ble/scripts/start-android.sh
```

- [ ] **Step 2: Build and install MetaMask with SmartTransport**

```bash
WITH_SPECULOS=1 yarn setup
WITH_SPECULOS=1 yarn build:android:main:dev
adb install -r app/builds/dev-debug.apk
```

- [ ] **Step 3: Verify BLE discovery**

1. Launch MetaMask on emulator
2. Navigate to Connect Hardware Wallet
3. Select Ledger (Nano X)
4. Verify "Ledger Nano X" appears in scan results

If the device is not found:

- Check `adb logcat | grep -i "bluetooth\|ble\|ledger"` for errors
- Check speculos-ble logs for incoming connections
- Verify advertising is active: `curl http://127.0.0.1:5002/ble/connection`

- [ ] **Step 4: Verify APDU exchange**

If discovery works:

1. Tap on "Ledger Nano X" to connect
2. Check speculos-ble logs for GATT connection and MTU negotiation
3. The app should attempt to get the Ethereum app name/version
4. Check `curl http://127.0.0.1:5002/debug/apdu-log` for APDU exchanges

- [ ] **Step 5: Document results**

Record findings — any protocol mismatches, timing issues, or missing features. Create issues for follow-up.

---

## Summary

| Task | Description                       | Depends On |
| ---- | --------------------------------- | ---------- |
| 1    | Python environment setup          | —          |
| 2    | Android emulator transport config | 1          |
| 3    | Harden APDU bridge and client     | 1          |
| 4    | Stack startup script              | 1, 2, 3    |
| 5    | Validate BLE framing protocol     | 1          |
| 6    | Wire SmartTransport into Metro    | —          |
| 7    | E2E smoke test                    | 6          |
| 8    | Integration test                  | 4          |
| 9    | GATT server notify fix            | 1          |
| 10   | Android BLE setup docs            | —          |
| 11   | End-to-end validation             | 1-10       |

**Critical path:** Tasks 1 → 2 → 4 → 11 (must be sequential). Tasks 3, 5, 6, 7, 9, 10 can be done in parallel.

**Risk areas:**

1. **Python 3.14 compatibility** — grpcio and Bumble may not support it. Mitigation: use Python 3.12 venv.
2. **Android emulator BLE support** — Root Canal/netsim may not work on all API levels. Mitigation: use API 34 with Google APIs.
3. **BLE framing mismatch** — `@ledgerhq/react-native-hw-transport-ble` may use a different framing than expected. Mitigation: Task 5 validates this early.
4. **MTU negotiation** — The Ledger transport requests MTU=156. Bumble must handle this correctly. Mitigation: test with different MTU values.
