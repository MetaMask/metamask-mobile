# MetaMask Mobile E2E Testing Guidelines

## Core Principles

1. **Test Coverage is Critical**: Higher coverage creates more confidence and helps identify bugs effectively.
2. **Tests Should Be Reliable**: Tests should consistently produce the same results and be resilient to minor system changes.
3. **Tests Should Provide Fast Feedback**: Optimize for quick execution and clear failure messages.
4. **Tests Should Be Easy to Debug**: When a test fails, it should be clear what functionality is broken.
5. **Tests Should Be Maintainable**: Structure tests for easy maintenance as the application evolves.

## Test Naming Conventions

### DO:

- Use clear, descriptive names that communicate the purpose of the test
- Name tests based on what they verify (e.g., `adds Bob to the address book`)
- Keep names concise but informative

### DON'T:

- Use the prefix 'should' (e.g., `should add Bob to the address book`)
- Include multiple behaviors with 'and' in a single test name
- Use vague or generic names

## Test Organization - MANDATORY

- Organize tests into folders based on features and scenarios
- Use the a directory that suits the test type (regression|smoke) based on the tag used
- Each feature team should own one or more folders of tests
- Follow the same organization pattern as the extension team for consistency
- Place tests in logical feature directories:
  ```
  tests/smoke/<feature-name>/<e2e-test-name.spec.ts>
  tests/smoke/tokens/import/import-erc1155.spec.ts
  tests/regression/wallet/settings/clear-activity.spec.ts
  tests/regression/ppom/ppom-blockaid-alert-erc20-approval.spec.ts
  ```

## Framework Architecture

### Core Classes

- **`Assertions`** - Enhanced assertions with auto-retry and detailed error messages
- **`Gestures`** - Robust user interactions with configurable element state checking
- **`Matchers`** - Type-safe element selectors with flexible options
- **`Utilities`** - Core utilities with specialized element state checking

### Key Features

- ✅ **Auto-retry** - Handles flaky network/UI conditions
- ✅ **Cross-framework** - `Gestures`, `Assertions`, and `Matchers` work in both Detox and Appium
- ✅ **Configurable element state checking** - Control visibility, enabled, and stability checks per interaction
- ✅ **Performance optimization** - Stability checking disabled by default for better performance
- ✅ **Better error messages** - Descriptive errors with retry context and timing
- ✅ **Type safety** - Full TypeScript support with IntelliSense

### Cross-Framework Support

`Gestures`, `Assertions`, and the three common `Matchers` methods (`getElementByID`, `getElementByText`, `getElementByLabel`) automatically route to the correct framework at runtime. Page objects that use them work in both Detox and Appium with no changes.

```
Page object calls Gestures.waitAndTap(elem)
        │
        ├── Detox run  → existing Detox implementation (retry, stability checks)
        └── Appium run → AppiumGestureStrategy → PlaywrightGestures
```

This means a Detox smoke test and its Appium counterpart share the same page object calls — only the test runner wrapper and login flow differ between them.

## Writing Page Objects

### Default Pattern — works in both frameworks

Use `Matchers.getElementByID/Text/Label` for getters and `Gestures`/`Assertions` for actions. No framework-specific imports needed.

```typescript
import Matchers from '../framework/Matchers';
import Gestures from '../framework/Gestures';
import Assertions from '../framework/Assertions';
import { LoginPageSelectors } from './LoginPage.testIds';

class LoginPage {
  get passwordInput() {
    return Matchers.getElementByID(LoginPageSelectors.PASSWORD_INPUT);
  }

  get errorMessage() {
    return Matchers.getElementByText('Invalid password');
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.passwordInput, password, {
      elemDescription: 'password input',
    });
  }

  async verifyErrorVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.errorMessage);
  }
}

export default new LoginPage();
```

### Edge Case: different selector per framework

When the same element has a different testID or selector strategy between Detox and Appium, use `resolve()` from the framework:

```typescript
import { resolve } from '../framework';

// Different testID per framework
get actionButton() {
  return resolve({
    detoxTestID: TabBarSelectorIDs.TRADE,
    appiumTestID: TabBarSelectorIDs.ACTIONS,
  });
}

// Different testID on iOS Appium vs everything else
get container() {
  return resolve({
    testID: WalletViewSelectorsIDs.WALLET_CONTAINER,
    iosAppiumTestID: WalletViewSelectorsIDs.EYE_SLASH_ICON,
  });
}
```

Available `resolve()` shapes:

| Shape                                                   | When to use                                             |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `{ testID }`                                            | Same testID works in all frameworks/platforms           |
| `{ detoxTestID, appiumTestID }`                         | Different testID between Detox and Appium               |
| `{ detoxTestID, androidAppiumTestID, iosAppiumTestID }` | All three differ                                        |
| `{ testID, iosAppiumTestID }`                           | Detox + Android Appium share testID; iOS Appium differs |
| `{ label }`                                             | Match by accessibility label                            |
| `{ text }`                                              | Match by visible text                                   |

### Edge Case: different selector type per framework

When the selector strategy itself differs (e.g. Detox matches by ID+label, Appium matches by text), use `encapsulated()`:

```typescript
import { encapsulated } from '../framework/EncapsulatedElement';
import PlaywrightMatchers from '../framework/PlaywrightMatchers';

getAccountElementByName(accountName: string) {
  return encapsulated({
    detox: () => Matchers.getElementByIDAndLabel(AccountCellIds.ADDRESS, accountName),
    appium: () => PlaywrightMatchers.getElementByText(accountName),
  });
}
```

### Edge Case: different action flow per framework

When the action itself must differ structurally between frameworks (e.g. Appium must scroll before tapping, or must hide the keyboard after typing), use `encapsulatedAction()`:

```typescript
import { encapsulatedAction } from '../framework/encapsulatedAction';

async enterPassword(password: string): Promise<void> {
  await encapsulatedAction({
    detox: async () => {
      await Gestures.typeText(this.passwordInput, password);
    },
    appium: async () => {
      await Gestures.typeText(this.passwordInput, password);
      await PlaywrightGestures.hideKeyboard(); // iOS Appium requires explicit dismiss
    },
  });
}
```

**Only use `encapsulatedAction` when the flow genuinely differs.** If the same `Gestures.*` or `Assertions.*` call works for both, there is no need to branch.

### Selector decision tree

```
Does the same Matchers.getElementByID/Text/Label call work for both?
  YES → use it directly, no branching needed

  NO → Does only the testID value differ per framework?
    YES → resolve({ detoxTestID, appiumTestID, ... })

    NO → Does only the selector type differ (ID vs text vs label)?
      YES → encapsulated({ detox: ..., appium: ... })

      NO → Does the action flow itself differ?
        YES → encapsulatedAction({ detox: ..., appium: ... })
```

## Test Organization — Detox vs Appium Specs

Detox smoke tests live in `tests/smoke/`. Appium equivalents live in `tests/smoke-appium/` with the same folder structure. Because page objects are cross-framework, the test body is nearly identical — only the runner wrapper and login helper differ.

**Running Appium smoke locally:** see [Appium smoke testing](./appium-smoke-testing.md) for builds (`main-e2e-MetaMask.app`), commands (`yarn appium-smoke:ios`), and CI artifact download.

```typescript
// Detox: tests/smoke/accounts/my-feature.spec.ts
describe(SmokeAccounts('My feature'), () => {
  it('does the thing', async () => {
    await withFixtures(
      { fixture: new FixtureBuilder().build(), restartDevice: true },
      async () => {
        await loginToApp();
        await SomePage.tapSomething();
        await Assertions.expectElementToBeVisible(SomePage.result);
      },
    );
  });
});

// Appium: tests/smoke-appium/accounts/my-feature.spec.ts
appiumTest.describe(SmokeAccounts('My feature'), () => {
  appiumTest(
    'does the thing',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await SomePage.tapSomething(); // identical
          await Assertions.expectElementToBeVisible(SomePage.result); // identical
        },
      );
    },
  );
});
```

The only required differences are:

- `import { test as appiumTest }` from the Playwright fixture index
- `{ driver: _driver, currentDeviceDetails }` fixture args
- `currentDeviceDetails` passed to `withFixtures`
- `loginToAppPlaywright(...)` instead of `loginToApp()`
- Drop any `device.*` (Detox-only) calls

## Test Atomicity and Coupling

### When to Isolate Tests:

- Testing specific functionality of a single component or feature
- When you need to pinpoint exact failure causes
- For basic unit-level behaviors

### When to Combine Tests:

- For multi-step user flows that represent real user behavior
- When testing how different parts of the application work together
- When the setup for multiple tests is time-consuming and identical

### Guidelines:

- Each test should run with a dedicated browser and mock services
- Use the `withFixtures` function to create test prerequisites and clean up afterward
- Avoid shared mocks and services between tests when possible
- Consider the "fail-fast" philosophy - if an initial step fails, subsequent steps may not need to run

## Controlling State

### Best Practices:

- Control application state programmatically rather than through UI interactions
- Use fixtures to set up test prerequisites instead of UI steps
- Minimize UI interactions to reduce potential breaking points
- Improve test stability by reducing timing and synchronization issues

### Example:

```javascript
// GOOD: Use fixture to set up prerequisites
new FixtureBuilder()
  .withAddressBookControllerContactBob()
  .withTokensControllerERC20()
  .build();

// Then test only the essential steps:
// Login
// Send TST
// Assertion

// BAD: Building all state through UI
new FixtureBuilder().build();
// Login
// Add Contact
// Open test dapp
// Connect to test dapp
// Deploy TST
// Add TST to wallet
// Send TST
// Assertion
```

## Framework Best Practices

### TestIDs location example:

```typescript
// DON'T:
import { MyComponentSelectors } from '../../tests/selectors/Card/RecurringFeeModal.selectors';

// DO:
import { MyComponentSelectors } from './MyComponent.testIds';

const MyComponent = () => {
  return (
    <MyComponent testID={MyComponentSelectors.CONTAINER} />
  )
};
```

### Proper Waiting and Assertions

- NEVER use `TestHelpers.delay()` - it creates flaky tests and slows down test execution
- ALWAYS use proper waiting with Assertions from the framework:

  ```javascript
  // DON'T:
  TestHelpers.delay(1000);

  // DO:
  Assertions.expectElementToBeVisible(element, {
    description: 'element should be visible',
  });
  ```

### Framework Imports - MANDATORY

- ALWAYS import framework utilities from `tests/framework/index.ts`, not from individual utility files
- Use the centralized framework exports for consistency and maintainability

### Element State Checking Configuration

- **Default behavior**: `checkVisibility: true`, `checkEnabled: true`, `checkStability: false`
- **Performance optimization**: Stability checking disabled by default for better performance
- **When to enable stability**: Complex animations, moving screens, carousel components
- **When to disable checks**: Loading states, temporarily disabled elements

```typescript
// Default: checks visibility + enabled, skips stability
await Gestures.tap(button, { description: 'tap button' });

// Enable stability for animated elements
await Gestures.tap(carouselItem, {
  checkStability: true,
  description: 'tap carousel item',
});

// Skip checks for loading/processing elements
await Gestures.tap(processingButton, {
  checkVisibility: false,
  checkEnabled: false,
  description: 'tap processing button',
});
```

### Prohibited Patterns in Test Specs - MANDATORY

The following patterns are prohibited in test specs:

1. **Direct Element Selection**

   ```javascript
   // DON'T:
   element(by.id('some-id')).tap();

   // DO:
   SomePage.tapOnSomeElement();
   ```

2. **Direct By Selectors**

   ```javascript
   // DON'T:
   by.text('Submit');

   // DO:
   // Define in page object:
   static get submitButton() {
     return Matchers.getByText('Submit');
   }
   ```

3. **Direct waitFor Calls**

   ```javascript
   // DON'T:
   await waitFor(element).toBeVisible().withTimeout(2000);

   // DO:
   await Assertions.expectElementToBeVisible(element);
   ```

4. **Framework-specific imports in page objects when not needed**

   ```typescript
   // DON'T — unnecessary when the same call works cross-framework:
   import PlaywrightAssertions from '../framework/PlaywrightAssertions';
   import { asPlaywrightElement } from '../framework/EncapsulatedElement';

   await PlaywrightAssertions.expectElementToBeVisible(
     await asPlaywrightElement(this.heading),
   );

   // DO:
   import Assertions from '../framework/Assertions';

   await Assertions.expectElementToBeVisible(this.heading);
   ```

## Handling Flaky Tests

### Common Issues and Solutions

#### "Element not enabled" Errors

- **Cause**: Element exists but is not interactive (disabled/loading state)
- **Solution**: Use `checkEnabled: false` to bypass enabled state validation

```typescript
// Skip enabled check for temporarily disabled elements
await Gestures.tap(loadingButton, {
  checkEnabled: false,
  description: 'tap button during loading',
});
```

#### "Element moving/animating" Errors

- **Cause**: UI animations interfering with interactions
- **Solution**: Enable stability checking for that specific interaction

```typescript
await Gestures.tap(animatedButton, {
  checkStability: true, // Wait for animations to complete
  description: 'tap animated button',
});
```

#### Handling Flaky Navigation/Tap Issues

When elements sometimes don't respond to taps, use a higher-level retry pattern:

```typescript
async tapOpenAllTabsButton(): Promise<void> {
  return Utilities.executeWithRetry(
    async () => {
      await Gestures.waitAndTap(this.tabsButton, {
        timeout: 2000  // Short timeout for individual action
      });

      await Assertions.expectElementToBeVisible(this.tabsNumber, {
        timeout: 2000  // Short timeout for verification
      });
    },
    {
      timeout: 30000,  // Longer overall timeout for retries
      description: 'tap open all tabs button and verify navigation',
      elemDescription: 'Open All Tabs Button',
    }
  );
}
```

## Code Review Checklist - MANDATORY

Before submitting E2E tests, ensure:

- [ ] No usage of `TestHelpers.delay()` or `setTimeout()`
- [ ] All assertions have descriptive `description` parameters
- [ ] All gestures have descriptive `description` parameters
- [ ] Appropriate timeouts for operations (not magic numbers)
- [ ] Page Object pattern used for complex interactions
- [ ] Element selectors defined once and reused
- [ ] Framework configuration used appropriately
- [ ] Error handling for expected failure scenarios
- [ ] `Gestures`/`Assertions`/`Matchers` used directly — `PlaywrightAssertions`, `PlaywrightGestures`, `asPlaywrightElement` only imported when the flow genuinely requires framework-specific branching
- [ ] `encapsulatedAction` only used when Detox and Appium flows structurally differ — not just to call the same method twice

## Debugging Failed Tests

- Write tests that provide clear failure messages
- Include enough context in assertions to understand what failed
- Use descriptive selectors that won't break with minor UI changes
- Capture screenshots or logs at failure points when possible
- Use descriptive `description` parameters in all assertions and gestures

## Maintenance Guidelines

- Review and update tests when features change
- Delete tests for removed features
- Keep test files focused on specific features
- Extract common setup into helper functions or fixtures
- Document complex test setups with comments
- Avoid non-extendable logic for specific fixtures - make fixtures reusable
