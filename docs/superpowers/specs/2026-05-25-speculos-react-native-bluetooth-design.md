# Speculos React Native — Virtual Bluetooth Architecture

## Problem

The existing Speculos E2E integration for MetaMask Browser Extension uses a mocked WebHID transport (`navigator.hid` mock → WebSocket → ApduBridge → Speculos TCP). This approach works because Chrome extensions have access to the WebHID API and we can inject a mock before LavaMoat's SES lockdown.

React Native (MetaMask Mobile) has no WebHID API. Ledger hardware wallets communicate over **Bluetooth Low Energy (BLE)** in the mobile context — specifically the Ledger Nano X exposes a custom BLE GATT service for APDU exchange. To enable Speculos-based E2E testing for React Native, we must emulate a virtual Bluetooth peripheral that the mobile app can discover, connect to, and exchange APDU commands with, just as it would with a physical Nano X.

## Solution

Use **[Bumble](https://google.github.io/bumble/)** — Google's open-source Python Bluetooth stack — to create a **virtual BLE peripheral** that:

1. Advertises as a Ledger Nano X (configurable device name, service UUIDs)
2. Exposes a GATT server with the Ledger APDU service (write + notify characteristics)
3. Bridges GATT writes/notifications to Speculos TCP APDU
4. Provides a REST/gRPC control API for test orchestration (button presses, screenshots, error injection)

The React Native app uses its **native platform BLE stack** (CoreBluetooth on iOS, Android BLE on Android) — no mocks at the app level. The virtual peripheral is injected into the platform's Bluetooth stack via Bumble's transport layer.

```
┌──────────────────────────────────────────────────────────────────┐
│ React Native App (iOS Sim / Android Emulator / Physical Device)  │
│                                                                    │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Ledger Transport (e.g. @ledgerhq/react-native-hw-transport-ble)│
│  │  - Scans for BLE devices                                   │   │
│  │  - Connects to "Ledger Nano X" (or configured name)        │   │
│  │  - Exchanges APDU via GATT write/notify                    │   │
│  └───────────────┬───────────────────────────────────────────┘   │
│                   │                                                │
│  ┌────────────────▼──────────────────────────────────────────┐   │
│  │ Platform BLE Stack                                         │   │
│  │  iOS:    CoreBluetooth                                     │   │
│  │  Android: android.bluetooth (via Root Canal in emulator)   │   │
│  └───────────────┬───────────────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    │ BLE GATT (characteristic write/read/notify)
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Bumble Virtual Bluetooth Stack (Python, local / CI)               │
│                                                                    │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Bumble Controller                                          │   │
│  │  - Virtual BLE controller                                  │   │
│  │  - Advertising: "Ledger Nano X" + Nano X service UUID      │   │
│  │  - Links to remote Link or VHCI                            │   │
│  └───────────────┬───────────────────────────────────────────┘   │
│                   │                                                │
│  ┌────────────────▼──────────────────────────────────────────┐   │
│  │ Bumble Host + GATT Server                                  │   │
│  │  - Registers Ledger APDU service (custom UUIDs)            │   │
│  │  - Write characteristic: receives APDU from mobile app     │   │
│  │  - Notify characteristic: sends APDU response to mobile app│   │
│  │  - Connection/disconnection event handling                  │   │
│  └───────────────┬───────────────────────────────────────────┘   │
│                   │                                                │
│  ┌────────────────▼──────────────────────────────────────────┐   │
│  │ APDU Bridge                                                │   │
│  │  - GATT write → raw APDU → TCP → Speculos                  │   │
│  │  - Speculos TCP response → APDU → GATT notify              │   │
│  │  - Error injection (swappable with mock)                    │   │
│  │  - Signing request detection                                │   │
│  └───────────────┬───────────────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    │ TCP (raw APDU: [4-byte BE length][data])
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Speculos (Ledger Emulator)                                        │
│  - ethereum.elf firmware                                          │
│  - TCP APDU port (9998)                                           │
│  - REST API port (5001): button presses, screenshots              │
└──────────────────────────────────────────────────────────────────┘
```

## Bumble Transport Strategies per Platform

Bumble supports multiple transport backends for connecting its virtual controller to a real or virtual Bluetooth host. The choice depends on the target platform:

| Target | Transport | How It Works |
|--------|-----------|--------------|
| **Android Emulator** | Android Emulator (gRPC to Root Canal / netsim) | Bumble connects to the Android emulator's virtual Bluetooth stack via gRPC. The virtual controller appears as a real BLE peripheral to apps inside the emulator. **Recommended for CI.** |
| **macOS (local dev)** | VHCI (`--enable-experimental-web-platform-features` not needed) | Bumble attaches a virtual controller to macOS's Bluetooth host via the VHCI kernel extension. The virtual peripheral is visible to system BLE scans. Physical iOS devices and simulators see it. |
| **Linux (CI)** | HCI Socket or VHCI | Bumble attaches via kernel HCI socket or VHCI. Virtual peripheral visible to connected devices/emulators. |
| **Physical iOS device** | External USB dongle + Bumble USB transport | Bumble drives a real Bluetooth USB dongle as a programmable peripheral. The iOS device sees it as a real BLE device. |
| **iOS Simulator** | N/A (BLE not supported) | iOS Simulator lacks BLE. Use a mock at the transport library level (`@ledgerhq/react-native-hw-transport-ble` mock) instead. See "iOS Simulator Workaround" below. |

### Android Emulator Transport (Primary CI Path)

This is the **recommended approach** for CI and local development with Android emulators.

```
Android Emulator
  ┌──────────────────────────────────────┐
  │  App Process                         │
  │    @ledgerhq/react-native-hw-transport-ble
  │      ↓ android.bluetooth API         │
  │  Android BLE Stack                   │
  │      ↓ HCI                           │
  │  Root Canal / netsim (virtual HAL)   │
  │      ↑ gRPC (localhost:8554)         │
  └──────────┼───────────────────────────┘
             │
┌────────────┼───────────────────────────┐
│ Bumble (Python, external process)      │
│            │                            │
│  AndroidEmulatorTransport              │
│    → connects to emulator gRPC         │
│    → injects virtual controller        │
│  Virtual Controller                    │
│    → advertises as Ledger Nano X       │
│  GATT Server                           │
│    → Ledger APDU service               │
└────────────┼───────────────────────────┘
             │ TCP :9998
             ▼
       Speculos (ethereum.elf)
```

**Setup:**

```bash
# 1. Start Android emulator with BLE support enabled
emulator -avd test_device -feature BLUETOOTH_EMULATION

# 2. Start Bumble virtual Ledger device (Python script)
python -m speculos_ble \
  --transport android-emulator \
  --grpc-port 8554 \
  --device-name "Ledger Nano X" \
  --speculos-host 127.0.0.1 \
  --speculos-apdu-port 9998 \
  --speculos-api-port 5001
```

## Ledger Nano X BLE GATT Profile

The Ledger Nano X exposes a custom BLE GATT service for APDU exchange. Bumble's virtual peripheral must replicate this exactly.

### Service UUID

```
13d63400-2c97-0004-0000-4c6564676572
```

(Standard Ledger Nano X communication service UUID)

### Characteristics

| Characteristic | UUID | Properties | Purpose |
|---------------|------|------------|---------|
| **Write** | `13d63400-2c97-0004-0002-4c6564676572` | Write, Write Without Response | Mobile app writes APDU commands |
| **Notify** | `13d63400-2c97-0004-0001-4c6564676572` | Notify | Hardware wallet responds with APDU data |
| **Device Info** | (standard DIS UUIDs) | Read | Device name, firmware version, etc. |

### APDU Write Protocol

Each APDU command is written as a single GATT write to the Write characteristic. The maximum write size depends on the negotiated MTU:

- **Default MTU (23 bytes):** APDU may be split across multiple writes by the transport library
- **Extended MTU (up to 512 bytes):** Most APDUs fit in a single write

The transport library (`@ledgerhq/react-native-hw-transport-ble`) handles MTU negotiation and APDU chunking transparently.

### Response Notification Protocol

APDU responses are delivered as GATT notifications on the Notify characteristic. If the response exceeds the MTU, it is chunked across multiple notifications. The transport library reassembles them.

## Component Architecture

### 1. Bumble Virtual Ledger Device (`speculos_ble` Python package)

A Python application built on Bumble's APIs that orchestrates the virtual Bluetooth peripheral.

```
speculos-ble/
├── pyproject.toml
├── src/speculos_ble/
│   ├── __init__.py
│   ├── __main__.py              # CLI entry point
│   ├── device.py                # VirtualLedgerDevice — wires together all components
│   ├── controller.py            # Virtual controller setup (advertising, connection params)
│   ├── gatt_server.py           # GATT server with Ledger APDU service
│   ├── apdu_bridge.py           # GATT ↔ Speculos TCP relay
│   ├── control_api.py           # REST API for test orchestration
│   ├── transports/
│   │   ├── android_emulator.py  # Android Emulator transport setup
│   │   ├── vhci.py              # macOS VHCI transport setup
│   │   └── hci_socket.py        # Linux HCI socket setup
│   ├── test_helpers.py          # Helper functions for test assertions
│   └── types.py                 # Type definitions
└── tests/
    └── ...
```

### 2. Control API (REST)

A REST API exposed alongside the virtual device for test orchestration. Mirrors Speculos's own REST API for button/screen operations, plus BLE-specific controls.

**Base URL:** `http://127.0.0.1:5002`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Readiness check |
| `/button/press` | POST | Simulate button press (left/right/both for Nano X) |
| `/screenshot` | GET | Get device screenshot via Speculos API |
| `/blind-signing/enable` | POST | Enable blind signing on emulated device |
| `/ble/advertise/start` | POST | Start/restart BLE advertising |
| `/ble/advertise/stop` | POST | Stop BLE advertising |
| `/ble/connection` | GET | Current connection status |
| `/ble/disconnect` | POST | Force disconnect the active BLE connection |
| `/error/inject` | POST | Inject next response error (for negative tests) |
| `/debug/apdu-log` | GET | Recent APDU exchange log |

**Example — press button and wait for signing:**

```bash
# Wait for the device to receive a signing APDU, then auto-approve
curl -X POST http://127.0.0.1:5002/signing/auto-approve \
  -H "Content-Type: application/json" \
  -d '{"presses": [{"button": "right", "count": 4}, {"button": "both"}]}'
```

### 3. APDU Bridge (GATT ↔ Speculos TCP)

The core relay between BLE GATT and Speculos TCP. This is the BLE equivalent of the browser extension's `ApduBridge`.

```python
class ApduBridge:
    """Relays APDU commands between BLE GATT and Speculos TCP."""

    def __init__(self, speculos_host: str, speculos_apdu_port: int):
        self._speculos = SpeculosTcpClient(speculos_host, speculos_apdu_port)
        self._exchange_mutex = asyncio.Lock()
        self._signing_apdu_detected = asyncio.Event()
        self._error_injection: bytes | None = None

    async def handle_gatt_write(self, data: bytes) -> None:
        """Called when the mobile app writes to the GATT Write characteristic."""
        apdu = data  # The raw APDU command bytes

        # Detect signing APDUs for test assertions
        if self._is_signing_apdu(apdu):
            self._signing_apdu_detected.set()

        async with self._exchange_mutex:
            if self._error_injection is not None:
                response = self._error_injection
                self._error_injection = None
            else:
                # Forward to Speculos via TCP
                response = await self._speculos.exchange(apdu)

            # Send response back via GATT notify
            return response

    def _is_signing_apdu(self, apdu: bytes) -> bool:
        """Detect signing operations by APDU instruction byte."""
        if len(apdu) < 5:
            return False
        ins = apdu[1]  # Instruction byte
        return ins in (0x04, 0x08, 0x1A, 0x20, 0x22)
```

### 4. GATT Server (Ledger APDU Service)

Registers the Ledger Nano X BLE service and characteristics on Bumble's GATT server.

```python
from bumble.gatt import Service, Characteristic, CharacteristicValue
from bumble.gatt_characteristic import GattCharacteristic

LEDGER_SERVICE_UUID = "13d63400-2c97-0004-0000-4c6564676572"
LEDGER_WRITE_CHAR_UUID = "13d63400-2c97-0004-0002-4c6564676572"
LEDGER_NOTIFY_CHAR_UUID = "13d63400-2c97-0004-0001-4c6564676572"

class LedgerGattServer:
    def __init__(self, apdu_bridge: ApduBridge):
        self._bridge = apdu_bridge

        self.write_characteristic = Characteristic(
            uuid=LEDGER_WRITE_CHAR_UUID,
            properties=Characteristic.WRITE | Characteristic.WRITE_WITHOUT_RESPONSE,
            permissions=Characteristic.Permission.WRITEABLE,
        )

        self.notify_characteristic = Characteristic(
            uuid=LEDGER_NOTIFY_CHAR_UUID,
            properties=Characteristic.NOTIFY,
            permissions=Characteristic.Permission.READABLE,
        )

        self.service = Service(
            uuid=LEDGER_SERVICE_UUID,
            characteristics=[self.write_characteristic, self.notify_characteristic],
        )

    async def on_write(self, connection, value: bytes):
        """Handle GATT write from mobile app."""
        response = await self._bridge.handle_gatt_write(value)
        if response:
            await connection.send_gatt_notification(
                self.notify_characteristic, response
            )
```

### 5. Virtual Controller Setup

Configures Bumble's virtual controller with Ledger-specific advertising data.

```python
from bumble.device import Device, AdvertisingData
from bumble.hci import Address, HCI_LE_1M_PHY

DEVICE_NAME = "Ledger Nano X"  # Configurable via env var

async def create_virtual_ledger(
    transport: str,
    gatt_server: LedgerGattServer,
) -> Device:
    """Create a Bumble Device acting as a Ledger Nano X."""

    device = Device.with_config(
        name=DEVICE_NAME,
        address=Address("00:11:22:33:44:55"),  # Static random address
        transport=transport,
    )

    # Register GATT service
    await device.add_service(gatt_server.service)

    # Configure advertising
    advertising_data = AdvertisingData()
    advertising_data.append(
        AdvertisingData.COMPLETE_LOCAL_NAME, DEVICE_NAME.encode()
    )
    advertising_data.append(
        AdvertisingData.COMPLETE_LIST_OF_128_BIT_SERVICE_CLASS_UUIDS,
        bytes.fromhex(LEDGER_SERVICE_UUID.replace("-", "")),
    )

    # Start advertising
    await device.start_advertising(
        advertising_data=advertising_data,
        scan_response_data=None,
        own_address_type=device.random_address,
        peer_address_type=Address.PUBLIC_DEVICE_ADDRESS,
    )

    return device
```

## Data Flow: Full APDU Exchange

This traces a complete `getPublicKey` APDU exchange from the React Native app through to Speculos and back:

```
1. React Native App
   └→ @ledgerhq/hw-app-eth.getAddress("44'/60'/0'/0/0")
     └→ @ledgerhq/react-native-hw-transport-ble.exchange(apdu)
       └→ Platform BLE: writeCharacteristic(service, writeChar, apdu)

2. Platform BLE Stack (iOS CoreBluetooth / Android BLE)
   └→ BLE GATT Write Request → Bumble Virtual Controller

3. Bumble Host
   └→ Receives GATT write on Write characteristic
     └→ LedgerGattServer.on_write(connection, apdu_bytes)
       └→ ApduBridge.handle_gatt_write(apdu_bytes)

4. ApduBridge
   └→ SpeculosTcpClient.send(apdu_bytes)         ─┐
     └→ TCP → 127.0.0.1:9998                      │
                                                    │
5. Speculos (ethereum.elf)                         │
   └→ Processes APDU                               │
   └→ Returns response via TCP                     │
                                                    │
6. ApduBridge                                      │
   └→ SpeculosTcpClient.receive() ← response  ─────┘
   └→ Returns response bytes

7. LedgerGattServer
   └→ connection.send_gatt_notification(notifyChar, response)

8. Bumble Virtual Controller
   └→ BLE GATT Notification → Platform BLE Stack

9. Platform BLE Stack
   └→ Characteristic value changed callback
     └→ @ledgerhq/react-native-hw-transport-ble receives response

10. React Native App
    └→ @ledgerhq/hw-app-eth parses response
    └→ Returns public key and address
```

## Test Integration Patterns

### A. Android Emulator (Recommended CI Path)

```bash
# CI workflow steps
1. Start Android emulator with BLE emulation
2. Start Speculos (via @metamask/speculos or docker)
3. Start Bumble virtual Ledger device
4. Install and launch React Native app on emulator
5. Run Detox/Appium E2E tests
```

```yaml
# Example CI step (GitHub Actions)
- name: Start Bumble Virtual Ledger
  run: |
    pip install speculos-ble
    speculos-ble \
      --transport android-emulator \
      --speculos-apdu-port 9998 \
      --speculos-api-port 5001 \
      --control-api-port 5002 \
      --device-name "Ledger Nano X" &
    # Wait for readiness
    curl --retry 30 --retry-delay 2 http://127.0.0.1:5002/health
```

### B. macOS Local Development (VHCI)

For local development on macOS, use Bumble's VHCI transport to inject a virtual controller into the macOS Bluetooth stack. The virtual peripheral then appears in system BLE scans and is discoverable by physical iOS devices or simulators running on the same machine.

```bash
# Requires sudo for VHCI access
sudo speculos-ble \
  --transport vhci \
  --speculos-apdu-port 9998 \
  --device-name "Ledger Nano X"
```

> **Note:** VHCI on macOS requires the `--experimental-enable-bluetooth-virtual-hci` flag and SIP adjustments. See Bumble's [macOS platform page](https://google.github.io/bumble/platforms/macos.html).

### C. iOS Simulator Workaround

iOS Simulator does **not support BLE** (CoreBluetooth APIs work but cannot discover real peripherals). For iOS simulator testing, we must mock at the transport library level — similar to how the browser extension mocks `navigator.hid`, but at the `@ledgerhq/react-native-hw-transport-ble` layer.

This is a secondary path that falls back to the mock pattern where Bumble cannot run:

```
React Native App (iOS Simulator)
  └→ @ledgerhq/react-native-hw-transport-ble (MOCK)
    └→ WebSocket → APDU Bridge → TCP → Speculos
```

This is **not the primary architecture** but a fallback for platforms where BLE emulation is unavailable (iOS Simulator, Web).

### D. Node.js Test Helper (TypeScript)

A TypeScript test helper for Detox/Appium/jest tests, mirroring the browser extension's `SpeculosTestHelper`:

```typescript
// packages/speculos-ble-test-helper/src/index.ts

interface VirtualLedgerConfig {
  transport: 'android-emulator' | 'vhci' | 'hci-socket';
  deviceName: string;
  speculosApduPort: number;
  speculosApiPort: number;
  controlApiPort: number;
  grpcPort?: number; // For android-emulator transport
}

interface VirtualLedgerInstance {
  controlApi: ControlApiClient;
  status: 'starting' | 'ready' | 'error';
  stop(): Promise<void>;
  screenshot(): Promise<Buffer>;
  pressButton(button: 'left' | 'right' | 'both'): Promise<void>;
  waitForSigningAndApprove(sequence: ButtonPress[]): Promise<void>;
  injectError(error: Buffer): void;
}

function createVirtualLedger(config: VirtualLedgerConfig): VirtualLedgerInstance;
```

## Comparison: Browser Extension vs React Native

| Aspect | Browser Extension (Current) | React Native (This Design) |
|--------|---------------------------|---------------------------|
| **Transport layer** | WebHID (`navigator.hid`) | BLE (`CoreBluetooth` / `android.bluetooth`) |
| **Mock strategy** | Inject mock before LavaMoat lockdown | Emulate real BLE peripheral via Bumble |
| **SDK** | `@ledgerhq/hw-transport-webhid` | `@ledgerhq/react-native-hw-transport-ble` |
| **Communication** | HID reports (64-byte packets) | GATT writes + notifications |
| **Framing** | Ledger HID framing (channel/tag/seq) | GATT MTU-based chunking |
| **Bridge component** | `ApduBridge` (WebSocket server, Node.js) | `ApduBridge` (Python, inside Bumble process) |
| **Emulator** | Speculos (Docker or native binary) | Speculos (same — unchanged) |
| **Control API** | Speculos REST API (:5001) + ApduBridge WebSocket (:9876) | Speculos REST API (:5001) + Bumble Control API (:5002) |
| **App code changes** | None (mock injected pre-lockdown) | None (real BLE peripheral visible to OS) |
| **LavaMoat concern** | Major (must inject before SES lockdown) | None (no LavaMoat in React Native) |

## Repo Structure

Following the existing `@metamask/speculos-up` + `@metamask/speculos` pattern from the browser extension work:

```
MetaMask/
├── speculos-up/                     # Existing: downloads speculos binary
├── speculos/                        # Existing: spawns speculos as child process
├── speculos-ble/                    # NEW: Python package for BLE virtual device
│   ├── pyproject.toml
│   ├── src/speculos_ble/
│   │   ├── __init__.py
│   │   ├── __main__.py
│   │   ├── device.py
│   │   ├── controller.py
│   │   ├── gatt_server.py
│   │   ├── apdu_bridge.py
│   │   ├── control_api.py
│   │   ├── transports/
│   │   │   ├── android_emulator.py
│   │   │   ├── vhci.py
│   │   │   └── hci_socket.py
│   │   └── types.py
│   └── tests/
└── metamask-mobile/                 # React Native app
    ├── e2e/
    │   └── speculos/
    │       ├── speculos-ble-test-helper/   # TypeScript npm package
    │       │   ├── src/
    │       │   │   ├── index.ts
    │       │   │   ├── virtual-ledger.ts   # createVirtualLedger()
    │       │   │   ├── control-api.ts      # REST client for Bumble control API
    │       │   │   ├── speculos-client.ts  # Reuse existing SpeculosClient pattern
    │       │   │   └── types.ts
    │       │   └── package.json
    │       ├── fixtures/
    │       │   └── with-speculos-fixtures.ts  # Test fixture wrapper
    │       └── constants.ts
    └── ...
```

## Dependencies

### Python (speculos-ble package)

| Package | Version | Purpose |
|---------|---------|---------|
| `bumble` | latest | Bluetooth stack (virtual controller, GATT server, transports) |
| `grpcio` | latest | gRPC for Android Emulator transport |
| `aiohttp` | latest | Control REST API server |
| `click` | latest | CLI argument parsing |

### TypeScript/Node.js (test helper package)

| Package | Version | Purpose |
|---------|---------|---------|
| `@metamask/speculos` | latest | Speculos process lifecycle (reuse) |
| `node-fetch` | built-in | REST calls to Bumble control API |

## Success Criteria

1. **Virtual BLE peripheral is discoverable** — React Native app on Android emulator scans and finds "Ledger Nano X" as a BLE device
2. **GATT service matches Ledger Nano X** — correct UUIDs, characteristics, and APDU write/notify flow
3. **Full APDU exchange works** — `getPublicKey`, `signTransaction`, `signPersonalMessage` all produce correct responses
4. **Button automation works** — Bumble control API presses buttons, emulated device screen updates
5. **Screenshots work** — Speculos screenshot captures emulated device state during test flows
6. **Error injection works** — negative tests (user rejection, device error) are testable
7. **CI integration** — Android emulator + Bumble + Speculos run in GitHub Actions
8. **iOS Simulator fallback** — transport-level mock works when BLE emulation is unavailable
9. **No production code changes** — React Native app's Ledger integration code is unchanged
10. **Existing E2E test patterns preserved** — `withSpeculosFixtures()` pattern maps cleanly to mobile

## References

- [Bumble — Python Bluetooth Stack](https://google.github.io/bumble/)
- [Bumble Transports](https://google.github.io/bumble/transports/index.html)
- [Bumble Android Emulator Transport](https://google.github.io/bumble/transports/android_emulator.html)
- [Bumble GATT Server API](https://google.github.io/bumble/api/guide.html)
- [Bumble Platforms — macOS](https://google.github.io/bumble/platforms/macos.html)
- [Ledger Nano X BLE Communication Protocol](https://ledgerhq.github.io/developer-portal/documents/APDU_Specification.pdf)
- [Speculos — Ledger Emulator](https://github.com/LedgerHQ/speculos)
- [`@ledgerhq/react-native-hw-transport-ble`](https://github.com/LedgerHQ/ledger-live/tree/develop/libs/ledgerjs/packages/react-native-hw-transport-ble)
- [Existing Speculos Design Spec](./2026-05-25-speculos-up-design.md)
- [Existing Multi-Device Speculos Design](./2026-05-24-multi-device-speculos-design.md)
- [Existing Speculos README](../../test/e2e/speculos/README.md)
