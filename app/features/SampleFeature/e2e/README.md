# Sample Feature E2E Test Documentation

This directory contains end-to-end test implementation and documentation for the Sample Feature in MetaMask Mobile.

## Overview

The Sample Feature is a development/testing feature that demonstrates:

- Feature with state management
- Controller setup and usage
- Form validation and error handling
- Navigation patterns within the app
- UI component library usage and styling
- Metametrics tracking
- Unit testing
- End-to-end testing

## Directory Structure

```
e2e/
├── pages/                        # Page object models
│   └── SampleFeatureView.ts     # Sample Feature screen interactions
├── selectors/                    # Test selectors
│   └── SampleFeature.selectors.ts
├── specs/                        # Actual test implementations
│   └── sample-feature.spec.ts   # TypeScript e2e tests
├── sample-scenarios.feature      # Test scenario documentation (Gherkin)
└── README.md                     # This file
```

## Important: Feature Flag Requirement

> [!CRITICAL]
> The Sample Feature uses code fencing and requires the `INCLUDE_SAMPLE_FEATURE=true` environment variable to be included in builds.
> **E2E tests will fail if the Sample Feature is not included in the build!**

The Sample Feature is completely removed from production builds using code fencing (see [Build Configuration](../README.md#build-configuration)). This means:

- Without the flag: The feature code doesn't exist in the app bundle
- With the flag: The feature code is included and can be tested

## Test Scenarios

The `sample-scenarios.feature` file documents test scenarios using Gherkin syntax for clarity. These scenarios serve as specifications for what should be implemented in the TypeScript tests.

> [!NOTE]
> Not all documented scenarios are currently implemented in the sample feature's TypeScript tests.
> In a production feature, all documented scenarios should be fully implemented to ensure comprehensive test coverage.

1. **Navigation Tests**
   - Accessing the Sample Feature through Settings > Developer Options
   - Verifying all UI elements are displayed correctly

2. **Counter Tests**
   - Basic increment functionality
   - Multiple increments
   - State persistence during session

3. **Pet Names Tests**
   - Creating new pet names with real addresses (Alice, Bob, Charlie)
   - Updating existing pet names
   - Form validation for address and name fields
   - Duplicate address handling with update confirmation
   - Network-specific behavior (Mainnet vs Linea)
   - Managing multiple pet names with truncated address display

4. **UI/UX Tests**
   - UI elements and styling verification
   - Error handling for invalid addresses

## Test Data

### Valid Test Addresses

These are real, valid Ethereum addresses used throughout the Sample Feature tests:

- `0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05` (Alice)
- `0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44` (Bob)
- `0xA8c23800fe9942e9aBd6F3669018934598777eC1` (Charlie)

### Invalid Test Addresses

- Too short: `0x123`
- Too long: `0x123456789012345678901234567890123456789012`
- Invalid characters: `0xGHIJKL...`
- Missing prefix: `1234567890123456789012345678901234567890`
- Invalid checksum: `0x67992A2cc038888D1d111B415670c2dEc4eAD83c`

## Key Testing Points

### Counter Feature

- Initial value should be 0
- Each increment should increase value by 1
- Value persists during the session and app restart
- Analytics events are tracked for increments

### Pet Names Feature

- Pet names are stored per network (chainId)
- Address field requires valid Ethereum address format
- Name field is required and cannot be empty
- Duplicate addresses show update confirmation dialog
- Selecting from list pre-fills the form for editing
- Values persist during the session and app restart

### Network Behavior

- Pet names are isolated per network
- Switching networks shows different pet name lists
- Current network is displayed at the top of the screen

## Running Tests

> [!IMPORTANT]
> These tests are for local development only and are not run in CI pipelines.

See the [End-to-End Testing section in the main Sample Feature README](../README.md#end-to-end-testing) for:

- Build and run commands
- E2E implementation details
- Key testing patterns
- Page object structure

### Test Implementation

The automated tests are implemented in TypeScript in the `specs/` directory:

- `sample-feature.spec.ts` - Contains the actual executable e2e tests (currently implements basic navigation and feature visibility)

The Gherkin files (`sample-scenarios.feature`) serve as documentation and specifications for what the TypeScript tests should cover. While the sample feature demonstrates the pattern with basic tests, production features should implement all documented scenarios.

> [!NOTE]
> These e2e tests are not included in CI pipelines as the Sample Feature is for development/demonstration purposes only.
> Production features should have their e2e tests integrated into the CI workflow.

## Important Notes

- This is a sample feature for development/testing purposes only
- Should not be activated in production builds
- Demonstrates best practices for feature development and test documentation patterns
- The test addresses provided are valid Ethereum addresses but are used for testing purposes only - they do not represent real user wallets (do not send anything in them)
  > [!IMPORTANT]
  > For production features: All scenarios documented in the Gherkin files should be implemented as automated tests to ensure comprehensive coverage
