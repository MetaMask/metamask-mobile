# Android Emulator BLE Setup for Speculos E2E Testing

## Prerequisites

- Android Studio with emulator support
- Python 3.10-3.13
- Docker (for Speculos)
- MetaMask Mobile dev environment (see `docs/readme/environment.md`)

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

The BLE bridge now lives in the `@metamask/hw-emulator` package (accounts repo).
Run it from there:

```bash
bash "$ACCOUNTS_REPO/packages/hw-emulator/scripts/start-android.sh"
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
- Check if `$TMPDIR/netsim.ini` exists (Bumble reads this)

### Bumble can't connect to emulator

- Check if netsim.ini exists: `ls $TMPDIR/netsim.ini`
- Try `speculos-ble --transport vhci` (macOS only, requires VHCI)
- Check emulator gRPC port (default 8554)

### APDU exchange fails

- Check Speculos logs: `docker logs speculos`
- Check speculos-ble logs for APDU framing errors
- Verify ELF binary matches model (nanox)
- Check APDU log: `curl http://127.0.0.1:5002/debug/apdu-log`

### Docker Speculos won't start

- Pull the image first: `docker pull ghcr.io/ledgerhq/speculos`
- Check port conflicts: `lsof -i :9999 -i :5000`
- Try removing old container: `docker rm -f speculos`
