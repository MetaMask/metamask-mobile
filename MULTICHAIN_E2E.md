# MetaMask Mobile Multichain E2E Testing Guide

This document explains how to set up and run multichain E2E tests for MetaMask Mobile, similar to those in the MetaMask Extension.

## Implementation Status

The current multichain E2E testing implementation includes:

- ✅ Multichain test dapp package installed (`@metamask/test-dapp-multichain`)
- ✅ Fixture helper configured with multichain dapp support
- ✅ Multichain network configuration support in FixtureBuilder
- ✅ MultichainTestDApp page object implemented
- ❌ Comprehensive multichain API test specs

## Using the Multichain Test Dapp

The fixture-helper includes support for the multichain test dapp. To use it in your tests:

1. The multichain test dapp package should already be installed:

```bash
yarn add --dev @metamask/test-dapp-multichain
```

2. Use the provided helpers in your test specs:

```javascript
// Import the helper constant
import { withFixtures, DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';

describe('Multichain API Tests', () => {
  it('should create a session with multiple chains', async () => {
    await withFixtures(
      {
        ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .build(),
      },
      async () => {
        // Navigate to multichain test dapp
        await MultichainTestDApp.navigateToMultichainTestDApp();
        
        // Connect to the dapp
        await MultichainTestDApp.connect();
        
        // Create a session with multiple chains
        await MultichainTestDApp.initCreateSessionScopes(['eip155:1', 'eip155:1337']);
        
        // Get session data and verify
        const session = await MultichainTestDApp.getSession();
        // Add assertions for the session data
      }
    );
  });
});
```

The implementation is fully backward compatible with existing tests. When the `multichainDapp` flag is not specified, tests will continue to use the standard test dapp.

## MultichainTestDApp Page Object

The MultichainTestDApp page object provides methods to interact with the multichain test dapp:

```javascript
// Key methods
await MultichainTestDApp.navigateToMultichainTestDApp(); // Navigate to the dapp
await MultichainTestDApp.connect(); // Connect MetaMask to the dapp
await MultichainTestDApp.initCreateSessionScopes(['eip155:1', 'eip155:1337']); // Create session with chains
const session = await MultichainTestDApp.getSession(); // Get current session data
```

## How the Test Dapp Works

### Local Dapp Setup

The multichain test dapp shares the same port as the regular test dapp. When a test uses the `multichainDapp: true` flag in the fixture options, the server serves the multichain test dapp instead of the regular one.

```javascript
// In fixture-helper.js
export const DEFAULT_TEST_DAPP_PATH = path.join('..', '..', 'node_modules', '@metamask', 'test-dapp', 'dist');
export const DEFAULT_MULTICHAIN_TEST_DAPP_PATH = path.join('..', '..', 'node_modules', '@metamask', 'test-dapp-multichain', 'build');
```

Both dapps use the same URL, but the `multichainDapp` flag determines which content is served:

```javascript
export const MULTICHAIN_TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;
```

### Enabling MULTICHAIN Feature Flag

To enable multichain functionality in the mobile app:

```bash
# For iOS
MULTICHAIN=1 yarn start:ios:e2e

# For Android
MULTICHAIN=1 yarn start:android:e2e
```

### Dapp Launching Process

The fixture helper (`e2e/fixtures/fixture-helper.js`) automatically:

1. Starts local nodes (Anvil instances) for blockchain interactions
2. Starts the fixture server to load app state
3. Starts the test dapp server
4. Loads any specified fixtures for the test

For multichain testing, multiple Anvil instances can be configured to run on different ports with different chain IDs.

## Creating Multichain Dapp Tests

To create multichain tests, use these key components:

### 1. Use DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS

This helper configures multiple local nodes and sets up the multichain dapp:

```javascript
{
  dapp: true,
  multichainDapp: true,
  localNodeOptions: [
    { type: 'anvil', options: {} },
    { type: 'anvil', options: { port: 8546, chainId: 1338 } }
  ]
}
```

### 2. Use FixtureBuilder with Multichain Support

```javascript
new FixtureBuilder()
  .withPopularNetworks()
  .withChainPermission(['0x1', '0x539']) // For chain permissions
  .build()
```

### 3. Use the MultichainTestDApp Page Object

The page object provides methods to interact with the dapp's UI elements and JavaScript APIs.

## Running Tests with Multichain Support

To run tests with multichain support:

```bash
# For iOS
MULTICHAIN=1 yarn test:e2e:ios

# For Android
MULTICHAIN=1 yarn test:e2e:android
```

## Overview of E2E Testing in MetaMask Mobile

MetaMask Mobile uses [Detox](https://github.com/wix/Detox) for end-to-end testing, which allows for testing interactions between the app and the UI, similar to how users would interact with it.

### Key Components

1. **Test Framework**: Uses Jest with Detox for mobile automation
2. **Fixtures**: Test data that can be loaded into the app's state
3. **Local Test Dapp**: A simple web application that simulates a dapp for testing interactions

## Test Dapp Setup for Multichain Testing

For multichain testing, we need two different test dapps:

1. **Regular Test Dapp**: The existing test dapp used for standard E2E tests
2. **Multichain Test Dapp**: A specialized dapp for testing multichain functionality

### Installing the Multichain Test Dapp

First, add the multichain test dapp package to the project:

```bash
yarn add --dev @metamask/test-dapp-multichain
```

### Serving the Test Dapps

The test dapps are automatically served by the fixture helper based on the options provided to the `withFixtures` function. When the `multichainDapp` flag is set to `true`, the multichain test dapp will be served instead of the regular test dapp.

### Configuring the Fixture Helper

The fixture helper has been updated to support the multichain test dapp. The key changes include:

1. Constants for test dapp paths:
   ```javascript
   export const DEFAULT_TEST_DAPP_PATH = path.join('..', '..', 'node_modules', '@metamask', 'test-dapp', 'dist');
   export const DEFAULT_MULTICHAIN_TEST_DAPP_PATH = path.join('..', '..', 'node_modules', '@metamask', 'test-dapp-multichain', 'build');
   ```

2. A new `multichainDapp` option in the `withFixtures` function:
   ```javascript
   export async function withFixtures(options, testSuite) {
     const {
       // ...other options
       multichainDapp = false,
       // ...more options
     } = options;
     // ...
   }
   ```

3. A helper constant for easy use in tests:
   ```javascript
   export const DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS = {
     dapp: true,
     multichainDapp: true,
     localNodeOptions: [
       { type: 'anvil', options: {} },
       { type: 'anvil', options: { port: 8546, chainId: 1338 } }
     ]
   };
   ```

## How the Test Dapp Works

### Local Dapp Setup

The test dapp runs locally on an HTTP server during tests. Here's how it's configured:

1. The dapp server runs on a port defined in `e2e/fixtures/utils.js` via `getLocalTestDappPort()`
2. The URL is constructed as `http://localhost:<port>` and exported as `TEST_DAPP_LOCAL_URL` in `e2e/pages/Browser/TestDApp.js`
3. The static server is created using `createStaticServer` in `e2e/create-static-server.js`

For multichain testing, we use the same port mechanism but serve the multichain dapp instead, controlled by the `multichainDapp` flag.

### Enabling MULTICHAIN Feature Flag

To enable multichain functionality in the mobile app:

```bash
# For iOS
MULTICHAIN=1 yarn start:ios:e2e

# For Android
MULTICHAIN=1 yarn start:android:e2e
```

Add these scripts to package.json:

```json
"scripts": {
  // ... existing scripts
  "start:ios:e2e:multichain": "MULTICHAIN=1 yarn start:ios:e2e",
  "start:android:e2e:multichain": "MULTICHAIN=1 yarn start:android:e2e",
  "test:e2e:ios:multichain": "MULTICHAIN=1 yarn test:e2e:ios",
  "test:e2e:android:multichain": "MULTICHAIN=1 yarn test:e2e:android"
}
```

### Dapp Launching Process

When running the E2E tests, the fixture helper (`e2e/fixtures/fixture-helper.js`) automatically:

1. Starts a local node (Ganache or Anvil) for blockchain interactions
2. Starts the fixture server to load app state
3. Starts the test dapp server(s)
4. Loads any specified fixtures for the test

For multichain testing, multiple Anvil instances need to be configured to run on different ports with different chain IDs.

### Navigating to the Test Dapp

To navigate to the multichain test dapp in tests, use the MultichainTestDApp page object:

```javascript
await MultichainTestDApp.navigateToMultichainTestDApp();
```

## Creating Multichain Dapp Tests

To implement multichain dapp tests similar to those in the extension, you'll need to:

### 1. Create a MultichainDapp Test Component

The `MultichainTestDApp.js` page object has been created to interact with the multichain test dapp.

### 2. Implement Fixtures for Multichain Tests

Modify your fixture builder to support multichain configurations:

```javascript
// In fixture-builder.js
withMultichainNetwork() {
  const baseState = this._state;
  
  // Configure NetworkController with multiple networks
  return {
    ...baseState,
    NetworkController: {
      ...baseState.NetworkController,
      networkConfigurations: {
        ...baseState.NetworkController.networkConfigurations,
        // Add additional network configurations
      },
      // Configure additional networks
    }
  };
}

withPermissionControllerConnectedToMultichainDapp(options = {}) {
  const { scopes = ['eip155:1', 'eip155:1337'] } = options;
  const baseState = this._state;
  
  // Configure permissions for the multichain dapp
  return {
    ...baseState,
    PermissionController: {
      ...baseState.PermissionController,
      subjects: {
        ...baseState.PermissionController.subjects,
        // Add multichain dapp permissions
      }
    }
  };
}
```

### 3. Write Multichain Tests

Now you can write tests similar to the extension format using the new helper. See the example test in `e2e/specs/multichain/multichain-api-example.spec.js`:

```javascript
describe('Multichain API Tests', () => {
  it('should connect to multichain dapp and create a session with multiple chains', async () => {
    await withFixtures(
      {
        ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .build(),
        restartDevice: true,
      },
      async () => {
        // Test code here
      },
    );
  });
});
```

## Mobile-Specific Considerations

### Key Differences from Extension Testing

1. **UI Interaction**: Mobile uses Detox gestures instead of Selenium
2. **Navigation**: Mobile has a different navigation flow with a browser tab
3. **Environment**: Mobile tests run on simulators/emulators rather than a browser
4. **Permissions UI**: Mobile has a different UI for approving connections and permissions
5. **JavaScript Bridge**: Mobile WebView communication may require different approaches than browser extensions
6. **Network Access**: Simulator/emulator network access to localhost requires special configuration

### JavaScript Communication

For complex interactions with the test dapp, you may need to implement JavaScript execution in the WebView:

```javascript
// Example of a JavaScript bridge function to add to your testing utilities
async function executeJavaScriptInWebView(webViewId, script) {
  if (device.getPlatform() === 'ios') {
    return await element(by.id(webViewId)).executeScript(script);
  } else {
    // For Android, you may need a custom solution
    // This is a placeholder - actual implementation will depend on your setup
    return await device.executeScript(script, [webViewId]);
  }
}
```

## Setting Up the Environment

1. Configure the `.e2e.env` file with appropriate variables
2. Install the multichain test dapp package
3. Ensure your test dapp is correctly set up in the project
4. Build the app with the MULTICHAIN feature flag
5. Run tests using the Detox commands in package.json

## Running Tests

```bash
# For iOS with multichain enabled
yarn test:e2e:ios:multichain

# For Android with multichain enabled
yarn test:e2e:android:multichain

# For specific tests
yarn test:e2e:ios:multichain --specs e2e/specs/multichain/your-test.spec.js
```

## Tips for Debugging

1. Use `console.log` statements in your tests
2. Check the Detox screenshots in the artifacts directory
3. Run tests with the `--debug` flag to watch the test execution
4. Use the `TestHelpers.delay()` method to slow down test execution for debugging
5. For WebView issues, try inspecting the WebView content using Safari Developer Tools (iOS) or Chrome DevTools (Android)
