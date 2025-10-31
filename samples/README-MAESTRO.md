# MetaMask Mobile Maestro Tests

This directory contains Maestro test flows for MetaMask Mobile that mimic the functionality of the existing Detox E2E tests.

## Files Overview

### Main Test Files

- `metamask-swap-test.yaml` - Main swap test that mimics `e2e/specs/swaps/swap-action-smoke.spec.ts`
- `android-flow.yaml` - Original sample test for Wikipedia app
- `ios-flow.yaml` - Original sample test for Wikipedia app

### Subflows

- `subflows/onboarding-flow.yaml` - Complete onboarding flow for new wallet creation
- `subflows/onboarding-android.yaml` - Original Android onboarding sample
- `subflows/onboarding-ios.yaml` - Original iOS onboarding sample
- `subflows/launch-clearstate-android.yaml` - Original Android clear state sample
- `subflows/launch-clearstate-ios.yaml` - Original iOS clear state sample

### Mock Server Scripts

- `scripts/start-mock-server.js` - Starts HTTP mock server for API responses
- `scripts/stop-mock-server.js` - Stops the mock server

## Prerequisites

1. **MetaMask Mobile App**: Ensure the MetaMask Mobile app is installed on your Android device/emulator with app ID `io.metamask`
2. **Maestro CLI**: Install Maestro CLI tool
3. **Node.js**: Required for running the mock server scripts

## Running the Tests

### 1. Start Mock Server (Optional)

The mock server provides controlled API responses for swap functionality:

```bash
node samples/scripts/start-mock-server.js
```

### 2. Run the Swap Test

```bash
cd samples
maestro test metamask-swap-test.yaml
```

### 3. Stop Mock Server

```bash
node samples/scripts/stop-mock-server.js
```

## Test Flow Description

The `metamask-swap-test.yaml` performs the following actions:

1. **Setup**: Starts mock server for API responses
2. **Launch**: Opens MetaMask Mobile app
3. **Onboarding**: Creates a new wallet through the onboarding flow
4. **Navigation**: Navigates to the swap functionality
5. **Swap Configuration**:
   - Enters swap amount (1 ETH)
   - Selects destination token (USDC)
   - Waits for quote calculation
6. **Execution**: Confirms and executes the swap
7. **Verification**: Verifies the swap appears in transaction history
8. **Cleanup**: Stops mock server

## Mocking Strategy

The mock server provides responses for:

- **Price API**: Token price data for ETH and USDC
- **Quote API**: Swap quotes for ETH to USDC conversion
- **Token API**: Available token list for Ethereum mainnet
- **Feature Flags**: Swap feature configuration

This allows the test to run without requiring:

- Real network connections
- Actual cryptocurrency transactions
- Live API dependencies

## Element Selectors

The test uses element IDs that should match the MetaMask Mobile app. Key selectors include:

- `wallet-swap-button` - Main swap button in wallet view
- `amount-input` - Amount input field
- `destination-token-selector` - Token selection dropdown
- `confirm-swap-button` - Swap confirmation button
- `network-fee-label` - Network fee display

## Differences from Detox Tests

1. **No Fixtures**: Uses onboarding flow instead of pre-configured fixtures
2. **Simplified Mocking**: HTTP server instead of complex proxy mocking
3. **UI-Driven**: Relies on UI interactions rather than programmatic state control
4. **Platform Specific**: Designed for Android (can be adapted for iOS)

## Troubleshooting

### Common Issues

1. **App Not Found**: Ensure MetaMask Mobile is installed with correct app ID
2. **Element Not Found**: Verify element selectors match current app version
3. **Mock Server Issues**: Check if port 3001 is available
4. **Timeout Issues**: Increase timeout values for slower devices

### Debugging Tips

1. Use `maestro studio` to inspect element selectors
2. Add `optional: true` to elements that may not always be present
3. Increase timeout values for network-dependent operations
4. Check mock server logs for API request patterns

## Extending the Tests

To add more swap scenarios:

1. Create new test files following the same pattern
2. Add additional mock responses in `start-mock-server.js`
3. Create specific subflows for different token pairs
4. Add validation steps for different transaction states

## Notes

- This test creates a real wallet during onboarding (no real funds)
- Mock server prevents actual network transactions
- Test is designed to be deterministic and repeatable
- Element selectors may need updates as the app UI evolves
