# MetaMask Mobile Multichain E2E Testing Guide

This document explains how to set up and run multichain E2E tests for MetaMask Mobile.

## Implementation Status

The current multichain E2E testing implementation includes:

- ✅ Multichain test dapp package installed (`@metamask/test-dapp-multichain`)
- ✅ Fixture helper configured with multichain dapp support
- ✅ Multichain network configuration support in FixtureBuilder
- ✅ MultichainTestDApp page object implemented
- ✅ Path rewriting for multichain test dapp URLs
- ❌ Comprehensive multichain API test specs

## Testing Goals

The current focus is to implement E2E tests only for EVM networks, as we're not yet ready for non-EVM network testing. We aim to replicate the following core test modules from the MetaMask extension:

1. **wallet_createSession tests**: Creating sessions with different scope combinations, verifying permissions, and testing account selection
2. **wallet_invokeMethod tests**: Testing RPC method invocation on specific chains, including read/write operations
3. **wallet_getSession tests**: Retrieving and verifying session information
4. **wallet_revokeSession tests**: Testing session revocation and permission cleanup

Additional modules planned for future implementation:
- wallet_notify tests for blockchain event notifications
- wallet_sessionChanged tests for session state change events

## Using the Multichain Test Dapp

The fixture-helper includes support for the multichain test dapp. To use it in your tests:

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
      }
    );
  });
});
```

## MultichainTestDApp Page Object

The MultichainTestDApp page object provides these key methods:

```javascript
await MultichainTestDApp.navigateToMultichainTestDApp(); // Navigate to the dapp
await MultichainTestDApp.connect(); // Connect MetaMask to the dapp
await MultichainTestDApp.initCreateSessionScopes(['eip155:1', 'eip155:1337']); // Create session with chains
const session = await MultichainTestDApp.getSession(); // Get current session data
```

## Running Tests

To run tests with multichain support:

```bash
# For iOS
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/multichain-api-example.spec.js

# For Android
MULTICHAIN=1 yarn test:e2e:android:debug:run e2e/specs/multichain/multichain-api-example.spec.js
```

## Technical Implementation Notes

1. The multichain test dapp requires URL path rewriting for proper resource loading
2. Both dapps use the same URL, but the `multichainDapp` flag determines which content is served
3. The fixture helper automatically:
   - Starts the fixture server to load app state
   - Starts the test dapp server
   - Loads any specified fixtures for the test

## Troubleshooting

If the multichain test dapp fails to load:
- Check for 404 errors in the debug logs - this may indicate path rewriting issues
- Verify that both `@metamask/test-dapp-multichain` package is installed
- Make sure the MULTICHAIN=1 environment variable is set when running tests
