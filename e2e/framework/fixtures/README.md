# WithFixtureOptions Documentation

## Overview

The `withFixtures` function provides a standardized way to set up test fixtures for MetaMask Mobile E2E tests. It handles the creation of fixture data, device configuration, and cleanup after tests.

## Basic Usage

```typescript
import { withFixtures } from '../framework/fixtures';
import { FixtureBuilder } from '../framework/fixtures/FixtureBuilder';

describe('My Test Suite', () => {
  it('should perform some action', async () => {
    await withFixtures(
      {
        // Fixture configuration options
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        // Test code goes here
        // All assertions and gestures
      },
    );
  });
});
```

## WithFixturesOptions Reference

| Option              | Type                    | Required | Default | Description                                                       |
| ------------------- | ----------------------- | -------- | ------- | ----------------------------------------------------------------- |
| `fixture`           | `FixtureBuilder`        | `true`   | -       | The fixture object created via FixtureBuilder                     |
| `restartDevice`     | `boolean`               | `false`  | `false` | Whether to restart the device before the test                     |
| `smartContracts`    | `string[]`              | `false`  | -       | The list of contract strings to be deployed via the first seeder  |
| `disableLocalNodes` | `boolean`               | `false`  | `false` | Disables all local nodes for the test                             |
| `dapps`             | `DappOptions[]`         | `false`  | -       | Lists the dapps that should be launched before the tests          |
| `localNodeOptions`  | `LocalNodeOptionsInput` | `false`  | Anvil   | Allows overriding the use of Anvil in favor of any other node     |
| `testSpecificMock`  | `TestSpecificMock`      | `false`  | -       | Allows to set mocks that are specific to the test                 |
| `launcArgs`         | `LaunchArgs`            | `false`  | `-`     | Allows sending arbitrary launchArgs such as the fixtureServerPort |
| `languageAndLocale` | `LanguageAndLocale`     | `false`  | -       | Set the device Language and Locale of the device                  |
| `permissions`       | `object`                | `false`  | -       | Allows setting specific device permissions                        |

## Migration from Legacy Options

| Legacy Option                          | Modern Replacement                                                                                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dapp=true`                            | `dapps: [{ dappVariat: DappVariants.SIMPLE }]`                                                                                                                                            |
| `multichaindapp=true`                  | `dapps: [{ dappVariant: DappVariants.MULTICHAIN }]`                                                                                                                                       |
| `ganacheOptions=defaultGanacheOptions` | `localNodeOptions: [{type: LocalNodeType.ganache, options: {hardfork: GanacheHardfork.london, mnemonic: 'WORD1 WORD2 WORD3 WORD4 WORD5 WORD6 WORD7 WORD8 WORD9 WORD10 WORD11 WORD12' }}]` |

## Examples

### Basic Test with Fixture

```typescript
await withFixtures(
  {
    fixture: new FixtureBuilder().build(),
    restartDevice: true,
  },
  async () => {
    // Test code
  },
);
```

### Test with a Multichain dapp and a Test Dapp

```typescript
await withFixtures(
  {
    fixture: new FixtureBuilder().build(),
    dapps: [
      {
        dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
        dappVariant: DappVariants.TEST_DAPP,
      },
    ],
    restartDevice: true,
  },
  async () => {
    // Test interactions with dapps
  },
);
```

### Test with 2 Test Dapp instances and 2 browser tabs with permitted connections

```typescript
await withFixtures(
  {
    fixture: new FixtureBuilder()
      .withPermissionControllerConnectedToMultipleTestDapps([{}, {}]) // Setting permissions for the 2 dapp instances
      .withMultipleDappTabs(2)
      .build(),
    dapps: [
      {
        dappVariant: DappVariants.TEST_DAPP,
        dappVariant: DappVariants.TEST_DAPP,
      },
    ],
    restartDevice: true,
  },
  async () => {
    // Test interactions with dapps
  },
);
```

### Test with Ganache Network Configuration

```typescript
await withFixtures(
  {
    fixture: new FixtureBuilder().build(),
    localNodeOptions: [
      {
        type: LocalNodeType.ganache,
        options: {
          hardfork: GanacheHardfork.london,
          mnemonic:
            'WORD1 WORD2 WORD3 WORD4 WORD5 WORD6 WORD7 WORD8 WORD9 WORD10 WORD11 WORD12',
        },
      },
    ],
    restartDevice: true,
  },
  async () => {
    // Test network-specific functionality
  },
);
```

## Best Practices

1. **Reuse fixtures** - when possible to reduce test setup time
2. **Only enable necessary features** - to keep tests focused and fast
3. **Use the FixtureBuilder** - to create flexible, reusable fixtures
4. **Include descriptive comments** - explaining fixture configuration choices
5. **Create fixtures that can be configurable** - some tests might require the same setup as other tests with minor tweaks that the fixture should allow.
