# E2E Testing Architecture and Framework

> **⚠️ ESSENTIAL:** Read [E2E Testing Overview](../../docs/readme/e2e-testing.md) for complete setup guide

- [E2E Framework Structure](#e2e-framework-structure)
- [E2E Testing Best Practices](#e2e-testing-best-practices)
- [E2E Test Examples and Patterns](#e2e-test-examples-and-patterns)
- [E2E Testing Anti-Patterns (AVOID THESE)](#e2e-testing-anti-patterns-avoid-these)
- [E2E Code Review Checklist](#e2e-code-review-checklist)
- [AI E2E Testing System](#ai-e2e-testing-system)

## E2E Framework Structure

- **Smoke Testing Scenarios (`tests/smoke/`)** - Test files organized by feature
- **Regression Testing Scenarios (`tests/regression/`)** - Test files organized by feature
- **TypeScript Framework (`tests/framework/`)**: Modern testing framework with type safety
- **Legacy JavaScript (`tests/utils/`)**: Deprecated utilities being migrated
- **Page Objects (`tests/pages/`)**: Page Object Model implementation
- **Selectors (`tests/selectors/`)**: Element selectors organized by feature
- **Fixtures (`tests/framework/fixtures/`)**: Test data and state management
- **API Mocking (`tests/api-mocking/`)**: Comprehensive API mocking system

**Core E2E Framework Classes:**

- **`Assertions.ts`** - Enhanced assertions with auto-retry and detailed error messages
- **`Gestures.ts`** - Robust user interactions with configurable element state checking
- **`Matchers.ts`** - Type-safe element selectors with flexible options
- **`Utilities.ts`** - Core utilities with specialized element state checking
- **`FixtureBuilder.ts`** - Builder pattern for creating test fixtures

**Key E2E Directories:**

- `tests/framework/` - TypeScript framework foundation (USE THIS)
- `tests/smoke/` - Smoke Test files organized by feature
- `tests/regression/` - Regression Test files organized by feature
- `tests/pages/` - Page Object classes following POM pattern
- `tests/selectors/` - Element selectors (avoid direct use in tests)
- `tests/api-mocking/` - API mocking utilities and responses
- `tests/fixtures/` - Test fixtures and data (⚠️ being deprecated)
- `tests/utils/` - Legacy utilities (⚠️ deprecated - use framework/)

## E2E Testing Best Practices

**CRITICAL: Always Use withFixtures Pattern**
Every E2E test MUST use `withFixtures` for proper test setup and cleanup:

```typescript
import { withFixtures } from '../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../framework/fixtures/FixtureBuilder';

await withFixtures(
  {
    fixture: new FixtureBuilder().build(),
    restartDevice: true,
  },
  async () => {
    // Test code here
  },
);
```

**Framework Usage (MANDATORY):**

- ✅ **ALWAYS** import from `tests/framework/index.ts` (not individual files)
- ✅ **ALWAYS** use modern TypeScript framework methods
- ❌ **NEVER** use legacy methods marked with `@deprecated`
- ❌ **NEVER** use `TestHelpers.delay()` - use proper waiting instead

**Page Object Model (REQUIRED):**

- ✅ **ALWAYS** use Page Object pattern - no direct selectors in test specs
- ✅ **ALWAYS** define element selectors in page objects or selector files
- ✅ **ALWAYS** access UI elements through page object methods
- ❌ **NEVER** use `element(by.id())` directly in test specs
- ❌ **NEVER** use raw Detox assertions in test specs

**Test Structure Requirements:**

- Use descriptive test names without 'should' prefix
- Include `description` parameters in ALL assertions and gestures
- Control application state programmatically via fixtures, not UI
- Use proper element state configuration (visibility, enabled, stability)
- Handle expected failures with try/catch, not broad timeouts

**API Mocking (ESSENTIAL):**

- All tests run with API mocking enabled by default
- Use `testSpecificMock` parameter in `withFixtures` for test-specific mocks
- Default mocks are loaded from `tests/api-mocking/mock-responses/defaults/`
- Feature flags mocked via `setupRemoteFeatureFlagsMock` helper

**Element State Configuration:**

```typescript
// Default behavior (recommended for most cases)
await Gestures.tap(button, { description: 'tap button' });
// checkVisibility: true, checkEnabled: true, checkStability: false

// For animated elements
await Gestures.tap(animatedButton, {
  checkStability: true,
  description: 'tap animated button',
});

// For loading/disabled elements
await Gestures.tap(loadingButton, {
  checkEnabled: false,
  description: 'tap loading button',
});
```

## E2E Test Examples and Patterns

- **ALWAYS** use `withFixtures` - every test must use this pattern
- **Framework Migration**: Use TypeScript framework (`tests/framework/`), not legacy JavaScript (`tests/utils/`)
- **API Mocking**: All tests run with mocked APIs - use `testSpecificMock` for test-specific needs
- **Page Objects**: Mandatory pattern - no direct element access in test specs
- **Element State**: Configure visibility, enabled, and stability checking appropriately
- **Debugging**: Check test output for unmocked API requests and framework warnings
- **Performance**: Use `checkStability: false` by default, enable only for animated elements
- Check `.cursor/rules/e2e-testing-guidelines.mdc` for comprehensive testing guidelines

**Basic E2E Test Structure:**

```typescript
import { SmokeE2E } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions';

describe(SmokeE2E('Feature Name'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('performs expected behavior', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Use page object methods, never direct selectors
        await WalletView.tapSendButton();

        // Use framework assertions with descriptions
        await Assertions.expectElementToBeVisible(WalletView.sendButton, {
          description: 'send button should be visible',
        });
      },
    );
  });
});
```

**Advanced Test with API Mocking:**

```typescript
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationsRedesignedFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...confirmationsRedesignedFeatureFlags),
  );
};

await withFixtures(
  {
    fixture: new FixtureBuilder()
      .withGanacheNetwork()
      .withPermissionControllerConnectedToTestDapp()
      .build(),
    restartDevice: true,
    testSpecificMock,
  },
  async () => {
    // Test implementation with mocked APIs
  },
);
```

**FixtureBuilder Usage Patterns:**

```typescript
// Basic fixture
new FixtureBuilder().build();

// With popular networks
new FixtureBuilder().withPopularNetworks().build();

// With connected test dapp
new FixtureBuilder()
  .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
  .build();

// With tokens and contacts
new FixtureBuilder()
  .withAddressBookControllerContactBob()
  .withTokensControllerERC20()
  .build();
```

**Page Object Implementation Example:**

```typescript
import { Matchers, Gestures, Assertions } from '../../framework';
import { WalletViewSelectors } from './WalletView.selectors';

class WalletView {
  get sendButton() {
    return Matchers.getElementByID(WalletViewSelectors.SEND_BUTTON);
  }

  get receiveButton() {
    return Matchers.getElementByID(WalletViewSelectors.RECEIVE_BUTTON);
  }

  async tapSendButton(): Promise<void> {
    await Gestures.tap(this.sendButton, {
      description: 'tap send button',
    });
  }

  async verifySendButtonVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.sendButton, {
      description: 'send button should be visible',
    });
  }
}

export default new WalletView();
```

## E2E Testing Anti-Patterns (AVOID THESE)

**❌ PROHIBITED Patterns:**

```typescript
// DON'T: Use TestHelpers.delay()
await TestHelpers.delay(5000);

// DON'T: Use deprecated methods
await Assertions.checkIfVisible(element);

// DON'T: Use direct element selectors in tests
element(by.id('send-button')).tap();

// DON'T: Use raw Detox assertions
await waitFor(element).toBeVisible();

// DON'T: Missing descriptions
await Gestures.tap(button);
await Assertions.expectElementToBeVisible(element);

// DON'T: Manual retry loops
let attempts = 0;
while (attempts < 5) {
  try {
    await Gestures.tap(button);
    break;
  } catch {
    attempts++;
  }
}
```

**✅ CORRECT Patterns:**

```typescript
// DO: Use proper waiting with framework
await Assertions.expectElementToBeVisible(element, {
  description: 'element should be visible',
});

// DO: Use modern framework methods
await Gestures.tap(button, { description: 'tap submit button' });

// DO: Use Page Object methods
await WalletView.tapSendButton();

// DO: Use framework retry mechanisms
await Utilities.executeWithRetry(
  async () => {
    await Gestures.tap(button, { timeout: 2000 });
    await Assertions.expectElementToBeVisible(nextScreen, { timeout: 2000 });
  },
  {
    timeout: 30000,
    description: 'tap button and verify navigation',
  },
);
```

## E2E Code Review Checklist

**Before submitting any E2E test, verify:**

- [ ] Uses `withFixtures` pattern for test setup
- [ ] Imports from `tests/framework/index.ts` (not individual files)
- [ ] No usage of `TestHelpers.delay()` or `setTimeout()`
- [ ] No deprecated methods (check `@deprecated` tags)
- [ ] All assertions have descriptive `description` parameters
- [ ] All gestures have descriptive `description` parameters
- [ ] Page Object pattern used (no direct selectors in tests)
- [ ] Element selectors defined in page objects or selector files
- [ ] Appropriate timeouts for operations (not magic numbers)
- [ ] API mocking configured when needed
- [ ] Tests work on both iOS and Android platforms
- [ ] Test names are descriptive without 'should' prefix
- [ ] Uses FixtureBuilder for test data setup
