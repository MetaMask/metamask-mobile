# Playwright + WebdriverIO Proof of Concept

## Overview

This proof of concept combines the best of both worlds:

- **Playwright**: Clean API, excellent test runner, and superior reporting
- **WebdriverIO**: Robust element finding, retry mechanisms, and mature mobile automation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Playwright Test Runner                    │
│              (Test execution, reporting, fixtures)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Test Fixtures     │
                    │  (fixture/index.ts) │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
  ┌────────▼──────────┐ ┌─────▼────────┐ ┌────────▼──────────┐
  │ DeviceProvider    │ │   Driver     │ │  Global Driver    │
  │   (Services)      │ │  (Fixture)   │ │   (globalThis)    │
  └────────┬──────────┘ └──────────────┘ └────────┬──────────┘
           │                                       │
           │         WebdriverIO Browser           │
           └───────────────────┬───────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  PlaywrightAdapter  │
                    │  (Adapter Layer)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ PlaywrightMatchers  │
                    │  (Element Finders)  │
                    └─────────────────────┘
```

## Key Components

### 1. Test Fixtures (`fixture/index.ts`)

Playwright fixtures that:

- Create device providers (EmulatorService, BrowserStackService, etc.)
- Initialize WebdriverIO Browser instance
- Make driver globally accessible
- Handle test lifecycle and cleanup

### 2. PlaywrightAdapter (`framework/PlaywrightAdapter.ts`)

Adapter that wraps WebdriverIO elements with Playwright-like API:

| Playwright Method     | WebdriverIO Method    | Description         |
| --------------------- | --------------------- | ------------------- |
| `.fill(text)`         | `.setValue(text)`     | Fill an input       |
| `.click()`            | `.click()`            | Click an element    |
| `.textContent()`      | `.getText()`          | Get text content    |
| `.isVisible()`        | `.isDisplayed()`      | Check visibility    |
| `.isEnabled()`        | `.isEnabled()`        | Check enabled state |
| `.type(text)`         | `.addValue(text)`     | Type with delays    |
| `.clear()`            | `.clearValue()`       | Clear input         |
| `.getAttribute(name)` | `.getAttribute(name)` | Get attribute       |

### 3. PlaywrightMatchers (`framework/PlaywrightMatchers.ts`)

Element finders that return wrapped elements:

```typescript
// By accessibility ID (most common for mobile)
const element = await PlaywrightMatchers.getByAccessibilityId('login-button');

// By XPath
const element = await PlaywrightMatchers.getByXPath(
  '//*[@resource-id="username"]',
);

// By text content
const button = await PlaywrightMatchers.getByText('Submit');

// Get multiple elements
const buttons = await PlaywrightMatchers.getAllByText('Delete');

// Platform-specific (Android)
const element = await PlaywrightMatchers.getByAndroidUIAutomator(
  'new UiSelector().text("Login")',
);

// Platform-specific (iOS)
const element = await PlaywrightMatchers.getByIOSPredicate('label == "Login"');
const element = await PlaywrightMatchers.getByIOSClassChain(
  '**/XCUIElementTypeButton',
);
```

### 4. Device Services (`services/`)

Device providers that create and manage WebdriverIO sessions:

- `EmulatorService` - Local emulator/simulator testing
- `BrowserStackService` - Cloud device testing (future)
- Custom providers - Extensible architecture

## Usage

### Basic Test Example

```typescript
import { test } from '../fixture';
import { PlaywrightMatchers } from '../framework';

test('login flow', async ({ driver }) => {
  // Find elements with Playwright-like matchers
  const username = await PlaywrightMatchers.getByAccessibilityId('username');
  const password = await PlaywrightMatchers.getByAccessibilityId('password');
  const loginButton = await PlaywrightMatchers.getByText('Login');

  // Use Playwright-style API
  await username.fill('user@example.com');
  await password.fill('mypassword');
  await loginButton.click();

  // Verify with assertions
  const welcomeMessage = await PlaywrightMatchers.getByText('Welcome!');
  const isVisible = await welcomeMessage.isVisible();
  expect(isVisible).toBe(true);
});
```

### Page Object Pattern

```typescript
import { PlaywrightMatchers, PlaywrightElement } from '../framework';

class LoginView {
  get passwordInput(): Promise<PlaywrightElement> {
    return PlaywrightMatchers.getByXPath(
      '//*[@resource-id="login-password-input"]',
    );
  }

  get loginButton(): Promise<PlaywrightElement> {
    return PlaywrightMatchers.getByText('Login');
  }

  async enterPassword(password: string): Promise<void> {
    // Clean Playwright-style API!
    await (await this.passwordInput).fill(password);
  }

  async tapLogin(): Promise<void> {
    await (await this.loginButton).click();
  }
}

export default new LoginView();
```

### Direct Driver Access

If you need WebdriverIO-specific functionality:

```typescript
test('using direct driver access', async ({ driver }) => {
  // Option 1: Use driver from fixture parameter
  const element = await driver.$('~username');
  await element.setValue('user@example.com');

  // Option 2: Use global driver via getDriver()
  import { getDriver } from '../utils';
  const globalDriver = getDriver();
  const password = await globalDriver.$('~password');
  await password.setValue('password123');
});
```

### Unwrapping Elements

Access underlying WebdriverIO element when needed:

```typescript
const element = await PlaywrightMatchers.getByAccessibilityId('button');

// Use Playwright-like methods
await element.fill('text');

// Or unwrap for WebdriverIO-specific methods
const wdioElement = element.unwrap();
await wdioElement.touchAction('tap');
```

## Benefits

### 1. Best of Both Worlds

✅ **Playwright's Clean API**: Modern, intuitive, easy to read and write  
✅ **WebdriverIO's Reliability**: Battle-tested retry logic, mobile automation expertise  
✅ **Playwright's Test Runner**: Fast, parallel, excellent reporting  
✅ **WebdriverIO's Flexibility**: Direct access when you need it

### 2. Developer Experience

- **Familiar syntax** for teams coming from Playwright
- **Type safety** with full TypeScript support
- **IntelliSense** for all methods and properties
- **Easy to learn** with clean, intuitive APIs

### 3. Migration Path

- **Gradual migration** from existing WebdriverIO tests
- **Coexistence** - use both APIs in the same test
- **No breaking changes** to existing infrastructure

### 4. Flexibility

- **Platform agnostic** - works with emulators, simulators, real devices, cloud providers
- **Extensible** - easy to add new matchers or element methods
- **Customizable** - full control over driver configuration

## Configuration

### Playwright Config (`playwright.config.ts`)

```typescript
export default defineConfig<WebDriverConfig>({
  projects: [
    {
      name: 'android-emulator',
      use: {
        platform: Platform.ANDROID,
        buildPath: '/path/to/app.apk',
        device: {
          provider: 'emulator',
          name: 'Pixel_7_API_34',
          udid: 'emulator-5554',
          osVersion: '14.0',
          packageName: 'com.example.app',
          launchableActivity: '.MainActivity',
        },
      },
    },
  ],
});
```

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/login.spec.ts

# Run with UI mode
npx playwright test --ui

# Run with debugging
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

## Advantages Over Pure WebdriverIO

1. **Better Test Runner**: Playwright's test runner is more modern and feature-rich
2. **Superior Reporting**: HTML reports, traces, screenshots, videos built-in
3. **Cleaner Syntax**: Playwright's API is more intuitive and readable
4. **Better DX**: TypeScript support, IntelliSense, better error messages
5. **Parallel Execution**: Out-of-the-box parallel test execution
6. **Fixtures**: Powerful dependency injection for test setup

## Advantages Over Pure Playwright

1. **Mobile Support**: WebdriverIO has mature mobile automation support
2. **Retry Logic**: WebdriverIO's element finding has robust retry mechanisms
3. **Flexibility**: Direct Appium/WebDriver access when needed
4. **Community**: Large mobile automation community and resources
5. **Cloud Providers**: Easy integration with BrowserStack, Sauce Labs, etc.

## Trade-offs

### Pros

- Clean, modern API
- Excellent test runner and reporting
- Robust element finding and retry logic
- Type safety and IntelliSense
- Flexible and extensible

### Cons

- Additional abstraction layer (minimal overhead)
- Type gymnastics for element types (handled with `as any`)
- Requires understanding of both frameworks
- Maintenance of adapter layer

## Future Enhancements

- [ ] Add more Playwright-like methods (`.hover()`, `.dragTo()`, etc.)
- [ ] Add custom assertions (`.toBeVisible()`, `.toHaveText()`, etc.)
- [ ] Add screenshot and video capabilities
- [ ] Add network mocking support
- [ ] Add accessibility testing helpers
- [ ] Performance monitoring integration
- [ ] Visual regression testing

## Contributing

When adding new functionality:

1. Follow the Playwright API naming conventions
2. Ensure TypeScript types are properly defined
3. Add comprehensive JSDoc comments
4. Update examples and documentation
5. Test on both iOS and Android platforms

## License

Same as MetaMask Mobile project
