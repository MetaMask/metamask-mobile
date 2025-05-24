# MetaMask Mobile Multichain E2E Testing Guide

This document explains how to set up and run multichain E2E tests for MetaMask Mobile.

## Implementation Status

The current multichain E2E testing implementation includes:

- ✅ Multichain test dapp package installed (`@metamask/test-dapp-multichain`)
- ✅ Fixture helper configured with multichain dapp support
- ✅ Multichain network configuration support in FixtureBuilder
- ✅ MultichainTestDApp page object implemented with enhanced session management
- ✅ Path rewriting for multichain test dapp URLs
- ✅ **wallet_createSession** comprehensive test suite implemented
- ❌ wallet_invokeMethod test specs
- ❌ wallet_revokeSession test specs

## Testing Goals

The current focus is to implement E2E tests only for EVM networks, as we're not yet ready for non-EVM network testing. We aim to replicate the following core test modules from the MetaMask extension:

1. **✅ wallet_createSession tests**: Creating sessions with different scope combinations, verifying permissions, and testing account selection
2. **wallet_invokeMethod tests**: Testing RPC method invocation on specific chains, including read/write operations
3. **wallet_getSession tests**: Retrieving and verifying session information
4. **wallet_revokeSession tests**: Testing session revocation and permission cleanup

Additional modules planned for future implementation:
- wallet_notify tests for blockchain event notifications
- wallet_sessionChanged tests for session state change events

## Test Files

### wallet_createSession.spec.ts
Comprehensive test suite for the `wallet_createSession` API including:

- ✅ Single chain session creation (Ethereum mainnet)
- ✅ Multi-chain session creation (Ethereum + Linea)
- ✅ All available EVM networks session creation
- ✅ Error handling for no networks selected
- ✅ Session information retrieval and verification
- ✅ Session verification helper methods

### multichain-api-example.spec.ts
Basic example tests for reference including:
- ✅ Dapp navigation and connection
- ✅ Basic multichain flow completion
- ✅ Custom chain selection

## Enhanced MultichainTestDApp Page Object

The MultichainTestDApp page object now includes enhanced methods similar to the web extension tests:

```typescript
// Create a session with specific networks
const sessionResult = await MultichainTestDApp.createSessionWithNetworks(['1', '59144']);

// Get session data (similar to web extension's getSession method)
const sessionData = await MultichainTestDApp.getSessionData();

// Verify session contains expected chains
const isValid = await MultichainTestDApp.verifySessionContainsChains(['1', '59144']);

// Get session chain count
const chainCount = await MultichainTestDApp.getSessionChainCount();
```

## Using the Multichain Test Dapp

The fixture-helper includes support for the multichain test dapp. To use it in your tests:

```javascript
// Import the helper constant
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';

describe('Multichain API Tests', () => {
  it('should create a session with multiple chains', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .build(),
      },
      async () => {
        // Navigate to multichain test dapp
        await MultichainTestDApp.navigateToMultichainTestDApp();
        
        // Create session with specific networks
        const sessionResult = await MultichainTestDApp.createSessionWithNetworks(['1', '59144']);
        
        // Verify session was created successfully
        expect(sessionResult.success).toBe(true);
        expect(sessionResult.sessionScopes).toHaveProperty('eip155:1');
        expect(sessionResult.sessionScopes).toHaveProperty('eip155:59144');
      }
    );
  });
});
```

## Running Tests

To run the createSession tests:

```bash
# For iOS
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts

# For Android
MULTICHAIN=1 yarn test:e2e:android:debug:run e2e/specs/multichain/wallet-createSession.spec.ts

# Run the example tests
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/multichain-api-example.spec.ts
```

### Running Individual Tests

You can run specific tests using the `--testNamePattern` option:

#### wallet_createSession Individual Tests
```bash
# Single Ethereum mainnet test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts --testNamePattern="should create a session with Ethereum mainnet scope"

# Multiple EVM chains test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts --testNamePattern="should create a session with multiple EVM chains"

# All available networks test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts --testNamePattern="should create a session with all available EVM networks"

# No networks selected test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts --testNamePattern="should handle session creation with no networks selected"

# Session information retrieval test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts --testNamePattern="should get session information after creating a session"

# Helper methods test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts --testNamePattern="should verify session contains expected chains using helper method"
```

#### wallet_getSession Individual Tests
```bash
# Empty session test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-getSession.spec.ts --testNamePattern="should successfully receive empty session scopes"

# Session scopes test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-getSession.spec.ts --testNamePattern="should successfully receive result that specifies"

# Session consistency test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-getSession.spec.ts --testNamePattern="should return consistent session data"

# Session modification test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-getSession.spec.ts --testNamePattern="should handle getSession after session has been modified"
```

#### wallet_revokeSession Individual Tests
```bash
# Empty session after revoke test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-revokeSession.spec.ts --testNamePattern="should return empty object from wallet_getSession call after revoking session"

# Prevent invoke method test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-revokeSession.spec.ts --testNamePattern="should prevent wallet_invokeMethod calls after session revoke"

# Multiple revoke calls test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-revokeSession.spec.ts --testNamePattern="should handle multiple revoke calls gracefully"

# Revoke when no session exists test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-revokeSession.spec.ts --testNamePattern="should handle revoke session when no session exists"
```

#### wallet_invokeMethod Individual Tests
```bash
# Read operations - eth_chainId test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-invokeMethod.spec.ts --testNamePattern="should match selected method to the expected output for eth_chainId"

# Read operations - eth_getBalance test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-invokeMethod.spec.ts --testNamePattern="should successfully call eth_getBalance method and return balance"

# Read operations - eth_gasPrice test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-invokeMethod.spec.ts --testNamePattern="should successfully call eth_gasPrice method and return gas price"

# Write operations - eth_sendTransaction test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-invokeMethod.spec.ts --testNamePattern="should successfully initiate eth_sendTransaction and show confirmation dialog"

# Multiple networks test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-invokeMethod.spec.ts --testNamePattern="should handle multiple method invocations across different networks"

# Error handling - no session test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-invokeMethod.spec.ts --testNamePattern="should handle invoke method when no session exists"

# Error handling - post revoke test
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-invokeMethod.spec.ts --testNamePattern="should handle invoke method after session revoke"
```

### Quick Test Commands (Short Patterns)
```bash
# Quick patterns for faster typing
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-createSession.spec.ts -t "Ethereum mainnet scope"
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-getSession.spec.ts -t "empty session scopes"
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-revokeSession.spec.ts -t "empty object from wallet_getSession"
MULTICHAIN=1 yarn test:e2e:ios:debug:run e2e/specs/multichain/wallet-invokeMethod.spec.ts -t "eth_chainId"
```

## Using the Online Test Dapp

For development and testing purposes, you can use the online version of the multichain test dapp:

```
https://devdapp.siteed.net/
```

To use the online version instead of the local version:

1. In `e2e/pages/Browser/MultichainTestDApp.ts`, the flag `USE_ONLINE_DAPP` is set to `true` by default
2. Keep the fixture settings intact (`dapp: true` and `multichainDapp: true`), as they manage the test environment state
3. The fixture server will still start, but the browser will navigate to the online URL

To revert to the local version:
1. Set `USE_ONLINE_DAPP` to `false` in `e2e/pages/Browser/MultichainTestDApp.ts`

## Technical Implementation Notes

1. The multichain test dapp requires URL path rewriting for proper resource loading
2. Both dapps use the same URL, but the `multichainDapp` flag determines which content is served
3. The fixture helper automatically:
   - Starts the fixture server to load app state
   - Starts the test dapp server
   - Loads any specified fixtures for the test
4. Session results are parsed from the dapp's DOM using web element IDs:
   - `session-method-result-0` for the first session method result
   - `session-method-details-0` for expandable session details
   - `invoke-method-${scope}-${method}-result-0` for invoke method results
5. Network checkboxes use IDs like `network-checkbox-eip155-1` for Ethereum mainnet

## Troubleshooting

If the multichain test dapp fails to load:
- Check for 404 errors in the debug logs - this may indicate path rewriting issues
- Verify that both `@metamask/test-dapp-multichain` package is installed
- Make sure the MULTICHAIN=1 environment variable is set when running tests
- Check browser console for JavaScript errors in the dapp

If session creation tests fail:
- Verify that MetaMask is properly connected to the dapp
- Check that the expected networks are available in the test environment
- Ensure the session results are properly populated in the DOM before verification

If invoke method tests fail:
- Verify that a session exists before attempting to invoke methods
- Check that the method selection UI is properly loaded
- Ensure method results appear in the expected DOM elements
- For transaction methods, verify confirmation dialogs appear as expected