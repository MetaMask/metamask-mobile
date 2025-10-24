# Maestro Tests with Mocks Guide

## Overview

This guide explains how to run Maestro tests with both **fixtures** (for app state) and **mocks** (for API responses).

## ✅ What We Built

### 1. Mock Server (`scripts/mock-server.js`)

A Node.js script that uses [Mockttp](https://github.com/httptoolkit/mockttp) to intercept and mock HTTP API calls:

- Mocks remote feature flags
- Runs on port `8000` (must match Detox DEFAULT_MOCKSERVER_PORT)
- Supports multiple presets
- Can run independently or with tests

### 2. Setup Script (`scripts/setup-test-environment.sh`)

Sets up the test environment by starting both servers (kept separate):

- Starts fixture server independently (port 12345)
- Starts mock server independently (port 8000)
- Sets up `adb reverse` port forwarding for both
- Clears app and launches
- Servers remain running for multiple test runs

### 3. Cleanup Script (`scripts/stop-servers.sh`)

Stops both servers:

- Stops fixture server
- Stops mock server
- Cleans up PID files

### 4. Example Test (`tests/add-wallet-with-mocks.yaml`)

A Maestro test equivalent of the Detox test `e2e/specs/accounts/import-srp.spec.ts`:

- Uses fixtures to bypass onboarding
- Uses mocks to control API responses
- Tests the import SRP (Secret Recovery Phrase) flow

---

## 🚀 Quick Start

### Method 1: Test Runner (Recommended)

Single command that handles everything:

```bash
./e2e/maestro/scripts/run-test-with-servers.sh e2e/maestro/tests/add-wallet-with-mocks.yaml
```

This automatically:

- Starts fixture server
- Starts mock server
- Sets up emulator
- Runs the test
- Stops servers

### Method 2: Setup + Run Multiple Tests

```bash
# Setup once
./e2e/maestro/scripts/setup-test-environment.sh default feature-flags

# Run multiple tests (reuse servers)
maestro test e2e/maestro/tests/test1.yaml
maestro test e2e/maestro/tests/test2.yaml

# Stop servers when done
./e2e/maestro/scripts/stop-servers.sh
```

### Method 3: Manual Control

```bash
# Terminal 1: Start fixture server
node e2e/maestro/scripts/fixture-loader.js --action start --fixture default

# Terminal 2: Start mock server
node e2e/maestro/scripts/mock-server.js --action start --preset feature-flags

# Terminal 3: Setup and run test
adb reverse tcp:12345 tcp:12345
adb reverse tcp:8000 tcp:8000
adb shell pm clear io.metamask
adb shell am start -n io.metamask/.MainActivity
sleep 10
maestro test e2e/maestro/tests/add-wallet-with-mocks.yaml

# Cleanup (any terminal)
./e2e/maestro/scripts/stop-servers.sh
```

---

## 📋 Prerequisites

### One-Time Setup

```bash
# 1. Build E2E app
yarn test:e2e:android:debug:build

# 2. Install on emulator
adb install -r android/app/build/outputs/apk/debugE2E/debug/app-debugE2E-debug.apk

# 3. Install mockttp (if not already installed)
yarn add -D mockttp
```

---

## 🎯 How It Works

### The Flow

```
┌─────────────────────────────────────┐
│  run-with-fixtures-and-mocks.sh     │
│  (Orchestrator)                      │
└─────────────┬───────────────────────┘
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────┐    ┌────────────┐
│ Fixture  │    │ Mock       │
│ Server   │    │ Server     │
│ :12345   │    │ :9090      │
└─────┬────┘    └─────┬──────┘
      │               │
      │  adb reverse  │
      │               │
      ▼               ▼
┌────────────────────────────┐
│  Android Emulator          │
│  ┌──────────────────────┐  │
│  │  MetaMask App        │  │
│  │  - Loads fixtures    │  │
│  │  - Uses mocked APIs  │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

### Port Forwarding

The script uses `adb reverse` to make both servers accessible from the emulator:

```bash
adb reverse tcp:12345 tcp:12345  # Fixture server
adb reverse tcp:9090 tcp:9090    # Mock server
```

This allows the app to reach:

- `http://localhost:12345/state.json` → Fixture state
- `http://localhost:8000/*` → Mocked APIs

---

## 🧪 Creating Your Own Test

### Step 1: Write the Maestro Test

```yaml
appId: io.metamask
tags:
  - your-feature
  - mocks
  - fixture
---
# Load page objects
- runFlow: ../pages/loadElements.yaml

# Unlock wallet (fixtures loaded)
- runFlow: ../subflows/unlock-wallet.yaml

# Your test steps here...
- tapOn: 'Some Button'
- assertVisible: 'Expected Result'
```

### Step 2: Setup Environment and Run

```bash
# Setup environment
./e2e/maestro/scripts/setup-test-environment.sh [fixture] [mock-preset]

# Run your test
maestro test e2e/maestro/tests/your-test.yaml

# Stop servers when done
./e2e/maestro/scripts/stop-servers.sh
```

**Examples:**

```bash
# Default fixture + feature-flags mocks
./e2e/maestro/scripts/setup-test-environment.sh
maestro test e2e/maestro/tests/your-test.yaml

# With-tokens fixture + feature-flags mocks
./e2e/maestro/scripts/setup-test-environment.sh with-tokens feature-flags
maestro test e2e/maestro/tests/your-test.yaml

# Custom fixture + default mocks
./e2e/maestro/scripts/setup-test-environment.sh full-setup default
maestro test e2e/maestro/tests/your-test.yaml
```

---

## 🔧 Mock Server Details

### Available Presets

| Preset          | Description                       |
| --------------- | --------------------------------- |
| `feature-flags` | Mocks remote feature flags API ⭐ |
| `default`       | Basic mocks for standard tests    |

### Adding New Mocks

Edit `scripts/mock-server.js` and add your mock setup:

```javascript
async function setupCustomMocks(mockServer) {
  // Mock your API endpoint
  await mockServer.forGet('https://api.example.com/data').thenJson(200, {
    success: true,
    data: {
      /* your mock data */
    },
  });

  console.log('✅ Custom mocks configured');
}
```

Then add it to the preset switch:

```javascript
if (preset === 'custom') {
  await setupCustomMocks(mockServer);
}
```

### Adding New Presets

Create a new preset in `fixture-loader.js`:

```javascript
'my-custom-preset': () =>
  new FixtureBuilder()
    .withGanacheNetwork()
    .withTokensController()
    .build(),
```

---

## 🛠️ Individual Server Control

For development or debugging, you can control servers individually:

### Start Servers Separately

```bash
# Start fixture server
./e2e/maestro/scripts/fixture-loader.js --action start --fixture default
# OR
node e2e/maestro/scripts/fixture-loader.js --action start --fixture default

# Start mock server
./e2e/maestro/scripts/start-mock-server.sh feature-flags
# OR
node e2e/maestro/scripts/mock-server.js --action start --preset feature-flags
```

### Stop Servers

```bash
# Stop all servers at once
./e2e/maestro/scripts/stop-servers.sh

# Or stop individually
pkill -f fixture-loader.js
pkill -f mock-server.js
```

### Run Multiple Tests (Reuse Servers)

```bash
# Setup once
./e2e/maestro/scripts/setup-test-environment.sh default feature-flags

# Run multiple tests (servers keep running)
maestro test e2e/maestro/tests/test1.yaml
maestro test e2e/maestro/tests/test2.yaml
maestro test e2e/maestro/tests/test3.yaml

# Cleanup when done
./e2e/maestro/scripts/stop-servers.sh
```

---

## 🔍 Troubleshooting

### "Mock server failed to start"

**Check port availability:**

```bash
lsof -i :8000
```

**Kill any process using the port:**

```bash
pkill -f mock-server.js
```

### "Fixture server failed to start"

See fixture troubleshooting in the main [fixtures guide](./scripts/run-with-fixtures.sh).

### App not using mocks

**Verify port forwarding:**

```bash
adb reverse --list | grep 8000
```

**Re-setup if needed:**

```bash
adb reverse tcp:8000 tcp:8000
```

### Test fails after servers start

The 10-second wait may not be enough. Increase it in `run-with-fixtures-and-mocks.sh`:

```bash
sleep 15  # or 20
```

---

## 📊 Comparison with Detox Tests

| Aspect              | Detox               | Maestro                |
| ------------------- | ------------------- | ---------------------- |
| **Fixtures**        | `withFixtures()`    | Fixture server (HTTP)  |
| **Mocks**           | `testSpecificMock`  | Mock server (Mockttp)  |
| **Setup**           | Automatic in test   | Separate servers       |
| **Cleanup**         | Automatic           | Trap on EXIT           |
| **Port Forwarding** | Not needed          | `adb reverse` required |
| **Speed**           | Faster (in-process) | Slightly slower (HTTP) |

---

## 🎯 Example: Detox vs Maestro

### Detox Test

```typescript
await withFixtures(
  {
    fixture: new FixtureBuilder().build(),
    testSpecificMock: async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(mockServer, {...});
    },
  },
  async () => {
    await loginToApp();
    // test steps...
  },
);
```

### Maestro Equivalent

```bash
# Run with script
./e2e/maestro/scripts/run-with-fixtures-and-mocks.sh e2e/maestro/tests/your-test.yaml

# Test YAML
- runFlow: ../subflows/unlock-wallet.yaml
# test steps...
```

---

## 📚 Related Documentation

- **[run-with-fixtures.sh](./scripts/run-with-fixtures.sh)** - Fixtures only (no mocks)
- **[fixture-loader.js](./scripts/fixture-loader.js)** - Fixture server details
- **[mock-server.js](./scripts/mock-server.js)** - Mock server implementation

---

## ✅ Success Checklist

- [ ] E2E app built and installed
- [ ] Emulator running
- [ ] `mockttp` package installed
- [ ] Port 12345 available (fixtures)
- [ ] Port 8000 available (mocks)
- [ ] Test file created
- [ ] Run script and test passes!

---

## 🎉 Benefits

| Benefit              | Description                             |
| -------------------- | --------------------------------------- |
| **Controlled State** | Fixtures provide known starting state   |
| **Controlled APIs**  | Mocks provide predictable API responses |
| **Fast Tests**       | Skip onboarding (~2 min saved)          |
| **Reliable**         | No external dependencies                |
| **Isolated**         | Tests don't affect each other           |

Happy testing! 🚀
