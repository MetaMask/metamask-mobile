# 🚧 Migration Notice (Still In Progress)

**TypeScript Framework Utils is NOT YET READY**: The updated TypeScript framework is still in progress.

- **Current Framework Utils**: `/e2e/utils/` (JavaScript - existing tests)
- **New Framework Utils**: `/e2e/framework/` (TypeScript - new tests and migrations)

**Migration Status**: 
- ✅ Phase 0: TypeScript framework foundation
- ✅ Phase 1: ESLint for E2E tests
- ⏳ Phase 2: Legacy framework replacement
- ⏳ Phase 3: Gradual test migration

```typescript
// New framework usage
import { Assertions, Gestures, Matchers } from '../framework';

await Assertions.expectElementToBeVisible(element, { description: 'element should be visible' });
await Gestures.tap(element, { description: 'tap element' });
```

# MetaMask Mobile E2E Testing Framework

This directory contains the End-to-End (E2E) testing framework for MetaMask Mobile, built with Detox and enhanced with TypeScript for better reliability and developer experience.

## 🚀 Quick Start

### Prerequisites
- Node.js and Yarn installed
- iOS Simulator or Android Emulator set up
- MetaMask Mobile development environment configured
- **📖 [Testing Setup Guide](../../docs/readme/testing.md)** - Essential reading for:
  - Local environment setup and configuration
  - Test wallet setup with testnet/mainnet access
  - Environment variables configuration (`.e2e.env`, `.js.env`)
  - Device setup instructions (iPhone 15 Pro, Pixel 5 API 34)
  - Building apps locally vs using prebuilt apps from Runway
  - Bitrise CI/CD pipeline information
  - Appium testing setup and BrowserStack configuration

### Running Tests
```bash
# Setup E2E dependencies
yarn setup:e2e

# iOS Tests
yarn test:e2e:ios:debug:build    # Build iOS app for testing
yarn test:e2e:ios:debug:run      # Run all iOS tests

# Android Tests  
yarn test:e2e:android:debug:build    # Build Android app for testing
yarn test:e2e:android:debug:run      # Run all Android tests

# Run specific test
yarn test:e2e:ios:debug:run e2e/specs/onboarding/create-wallet.spec.js

# Run tests by tag
yarn test:e2e:ios:debug:run --testNamePattern="Smoke"
```

## 📁 Directory Structure

```
e2e/
├── FRAMEWORK.md                 # This file - framework overview
├── specs/                      # All test files organized by feature
│   ├── onboarding/             # Onboarding flow tests
│   ├── wallet/                 # Wallet functionality tests
│   ├── swaps/                  # Token swap tests
│   └── ...                     # Other feature areas
├── utils/                      # Framework utilities (TypeScript)
│   ├── Assertions.ts           # Enhanced assertions with auto-retry
│   ├── Gestures.ts             # Robust user interactions
│   ├── Matchers.ts             # Type-safe element selectors
│   ├── Utilities.ts            # Core utilities and configuration
│   ├── types.ts                # TypeScript type definitions
│   ├── Assertions.js           # Legacy assertions (⚠️ deprecated - use .ts)
│   ├── Gestures.js             # Legacy gestures (⚠️ deprecated - use .ts)
│   ├── Matchers.js             # Legacy matchers (⚠️ deprecated - use .ts)
│   └── Utilities.js            # Legacy utilities (⚠️ deprecated - use .ts)
├── ESLINT-RULES.md             # Documentation for ESLint rules and best practices
├── pages/                      # Page Object classes
│   ├── BasePage.ts             # Base page with common functionality
│   ├── onboarding/             # Onboarding-related pages
│   ├── wallet/                 # Wallet-related pages
│   └── ...                     # Other page objects
├── resources/                  # Test data and configuration files
└── types/                      # TypeScript type definitions
```

## 🔧 Framework Architecture

### TypeScript Framework (Recommended)

The new TypeScript framework utilities provides enhanced reliability, better error messages, and type safety:

#### Core Classes:
- **`Assertions.ts`** - Enhanced assertions with auto-retry and detailed error messages
  - Modern methods: `expectElementToBeVisible()`, `expectElementToHaveText()`, `expectElementToHaveLabel()`, `expectTextDisplayed()`
  - Legacy methods marked `@deprecated` - use modern equivalents
- **`Gestures.ts`** - Robust user interactions with configurable element state checking
  - Modern methods: `tap()`, `typeText()`, `longPress()`, `swipe()`, `scrollToElement()`
  - **Element state flags**: `checkVisibility` (default: true), `checkEnabled` (default: true), `checkStability` (default: false)
  - **Performance optimization**: Stability checking disabled by default for better performance
  - Legacy methods marked `@deprecated` - use modern equivalents
- **`Matchers.ts`** - Type-safe element selectors with flexible options
  - Methods: `getElementByID()`, `getElementByText()`, `getElementByLabel()`, `getWebViewByID()`
- **`Utilities.ts`** - Core utilities with specialised element state checking
  - **State checking methods**: `checkElementReadyState()`, `checkElementEnabled()`, `checkElementStable()`
  - **Retry mechanisms**: `executeWithRetry()`, `waitForElementToBeEnabled()`, `waitForElementToStopMoving()`
  - **Configuration**: Flexible timeout and retry configuration
- **`types.ts`** - TypeScript type definitions including `GestureOptions` with element state flags

#### Key Features:
- ✅ **Auto-retry** - Handles flaky network/UI conditions
- ✅ **Configurable element state checking** - Control visibility, enabled, and stability checks per interaction
- ✅ **Performance optimization** - Stability checking disabled by default for better performance
- ✅ **Better error messages** - Descriptive errors with retry context and timing
- ✅ **Type safety** - Full TypeScript support with IntelliSense
- ✅ **Flexible configuration** - Adjustable timeouts, retry intervals, and element state validation
- ✅ **Backwards compatibility** - Works alongside existing JavaScript framework

#### Basic Usage:
```typescript
import Assertions from '../utils/Assertions';
import Gestures from '../utils/Gestures';
import Matchers from '../utils/Matchers';

// Configurable element state checking
const button = await Matchers.getElementByID('my-button');
await Assertions.expectElementToBeVisible(button, { description: 'button should be visible' });

// Default behavior: checkVisibility=true, checkEnabled=true, checkStability=false
await Gestures.tap(button, { description: 'tap button' });

// Enable stability checking for animated elements
await Gestures.tap(animatedButton, { 
  checkStability: true,
  description: 'tap animated button' 
});

// Skip visibility/enabled checks for special cases
await Gestures.tap(loadingButton, { 
  checkVisibility: false,
  checkEnabled: false,
  description: 'tap loading button' 
});
```

### Legacy JavaScript Framework (Backwards Compatible)

The original JavaScript framework continues to work but legacy methods are deprecated:

```javascript
// ❌ DON'T: Use deprecated methods
await Assertions.checkIfVisible(element(by.id('my-element')), 15000);

// ✅ DO: Use modern methods instead
await Assertions.expectElementToBeVisible(element, { description: 'element should be visible' });
```

## 📋 Page Object Pattern Best Practices

### Page Object Structure
```typescript
class LoginPage {
  // Getter pattern for elements
  get emailInput() { return Matchers.getElementByID('email-input'); }
  get passwordInput() { return Matchers.getElementByID('password-input'); }
  get loginButton() { return Matchers.getElementByID('login-button'); }
  
  // Public methods for actions
  async login(email: string, password: string): Promise<void> {
    await Gestures.typeText(this.emailInput, email, { description: 'enter email' });
    await Gestures.typeText(this.passwordInput, password, { description: 'enter password' });
    await Gestures.tap(this.loginButton, { description: 'tap login button' });
  }
  
  // Public methods for verifications
  async verifyLoginError(expectedError: string): Promise<void> {
    await Assertions.expectTextDisplayed(expectedError, {
      description: 'login error should be displayed'
    });
  }
}

export default new LoginPage();
```

### ✅ Page Object Best Practices
- Use getter pattern for element references (lazy evaluation)
- Export as singleton instance (`export default new LoginPage()`)
- Provide public methods for user actions and verifications
- Use descriptive method names that reflect user intent
- Include workflow methods for common multi-step actions
- Add verification methods for page state validation

## 🔧 Configuration

```typescript
// Per-operation timeout override
await Assertions.expectElementToBeVisible(element, {
  timeout: 30000,
  description: 'slow loading element'
});
```

## 🔍 ESLint Rules and Code Quality

The framework includes custom ESLint rules to automatically warn against anti-patterns and encourage best practices:

- **📖 [ESLint Rules Documentation](./ESLINT-RULES.md)** - Complete guide to the custom linting rules
- **🚨 Automatic Warnings** for `TestHelpers.delay()`, deprecated methods, and poor patterns
- **💡 Suggestions** for descriptive error messages and modern framework usage
- **🔧 Configurable** - Currently warnings, can be upgraded to errors for enforcement

### Quick Examples:
```javascript
// ❌ ESLint will warn about these patterns
await TestHelpers.delay(5000);                    // Use proper waiting instead
await Assertions.checkIfVisible(element);         // Deprecated method
await Gestures.tap(button);                       // Missing description

// ✅ ESLint approves these patterns  
await Assertions.expectElementToBeVisible(element, { description: 'button should appear' });
await Gestures.tap(button, { description: 'tap submit button' });
```

## ✅ E2E Testing Best Practices

### Test Structure Best Practices
```typescript
import LoginPage from '../pages/LoginPage';

describe('Feature: User Login', () => {
  beforeAll(() => {
    Utilities.configure({ timeout: 20000 });
  });
  
  it('should login successfully with valid credentials', async () => {
    await LoginPage.login('user@test.com', 'password123');
    await LoginPage.verifyLoginSuccess();
  });
});
```

### ✅ DO - Follow These Patterns
- Use modern TypeScript framework with descriptive messages
- Use Page Object pattern for maintainable tests  
- Let framework handle element stability and retries
- Configure appropriate timeouts for operations
- Handle expected failures gracefully with try/catch

### ❌ DON'T - Avoid These Anti-Patterns  
- **No arbitrary delays**: Replace `TestHelpers.delay()` with proper waiting
- **No deprecated methods**: Use modern equivalents (check `@deprecated` tags)
- **No magic numbers**: Use descriptive constants for timeouts
- **No repeated selectors**: Define elements once, reuse everywhere
- **No generic descriptions**: Use specific, helpful error messages

### Migration from Legacy Patterns

| Legacy Pattern | Modern Replacement |
|----------------|-------------------|
| `TestHelpers.delay(5000)` | `Assertions.expectElementToBeVisible(element, {timeout: 5000})` |
| `checkIfVisible(element, 15000)` | `expectElementToBeVisible(element, {timeout: 15000, description: '...'})` |
| `waitFor(element).toBeVisible()` | `expectElementToBeVisible(element, {description: '...'})` |
| `element.tap()` | `Gestures.tap(element, {description: '...'})` |
| `clearField(element); typeText(element, text)` | `typeText(element, text, {clearFirst: true})` |
| Manual retry loops | `executeWithRetry()` with proper configuration |

### Code Review Checklist

Before submitting E2E tests, ensure:

- [ ] No usage of `TestHelpers.delay()` or `setTimeout()`
- [ ] No deprecated legacy methods (marked with `@deprecated`)
- [ ] All assertions have descriptive `description` parameters
- [ ] All gestures have descriptive `description` parameters
- [ ] Appropriate timeouts for operations (not magic numbers)
- [ ] Page Object pattern used for complex interactions
- [ ] Element selectors defined once and reused
- [ ] Framework configuration used appropriately
- [ ] Error handling for expected failure scenarios
- [ ] Tests work on both iOS and Android platforms

## 🧪 Testing Patterns

## 🔄 Migration from Legacy Framework

The new TypeScript framework is fully backwards compatible. You can:

1. **Start with new tests** - Use TypeScript framework for all new tests
2. **Gradual migration** - Migrate existing tests one at a time  
3. **Mixed usage** - Use both frameworks in the same test file
4. **No breaking changes** - All existing tests continue to work

### Deprecated Legacy Methods

The following legacy methods are marked `@deprecated` and should be replaced:

#### Assertions.ts Legacy Methods:
- `checkIfVisible()` → Use `expectElementToBeVisible()`
- `checkIfTextIsDisplayed()` → Use `expectTextDisplayed()`
- `checkIfElementToHaveText()` → Use `expectElementToHaveText()`
- `checkIfElementHasLabel()` → Use `expectElementToHaveLabel()`
- And many more... (see `@deprecated` tags in code)

#### Gestures.ts Legacy Methods:
- `tapAndLongPress()` → Use `longPress()`
- `typeTextAndHideKeyboard()` → Use `typeText({hideKeyboard: true})`
- `clearField()` → Use `typeText({clearFirst: true})`
- `tapAtIndex()` → Use `tap()` with `element.atIndex()`
- And many more... (see `@deprecated` tags in code)

#### Common Anti-Pattern Replacements:
- `TestHelpers.delay()` → Use proper waiting with `expectVisible()` or similar
- Manual retry loops → Use `executeWithRetry()` or built-in framework retries
- Raw Detox assertions → Use framework assertions with descriptions

See the Migration section above for detailed migration instructions.

## 🛠 Framework Development

### Adding New Framework Features

1. **Core utilities** - Add to appropriate class in `utils/`
2. **Type definitions** - Update TypeScript interfaces
3. **Documentation** - Add examples to `examples/`
4. **Tests** - Verify functionality works correctly

### Framework Architecture

```
utils/Utilities.ts     - Core configuration and helper functions
utils/Assertions.ts    - Element state verification with retry
utils/Gestures.ts      - User interactions with stability checking  
utils/Matchers.ts      - Element selection and identification
utils/types.ts         - TypeScript type definitions
```

### Best Practices for Framework Development

- **Type safety** - Use proper TypeScript types
- **Error messages** - Provide descriptive, actionable error messages
- **Retry logic** - Handle transient failures gracefully
- **Documentation** - Include usage examples in README
- **Backwards compatibility** - Don't break existing functionality

## 🔗 Related Documentation

- **[Main README](../README.md)** - Project overview and setup instructions
- **[Architecture Overview](../README.md#architecture-overview)** - App architecture details
- **[Development Commands](../README.md#common-development-commands)** - Build and test commands

## 🤝 Contributing

When adding new tests or modifying the framework:

1. **Use TypeScript framework** for new tests and page objects
2. **Follow page object pattern** for complex UI interactions
3. **Include descriptive messages** in all assertions and gestures
4. **Configure appropriate timeouts** for your test environment
5. **Add examples** for new framework features
6. **Test on both iOS and Android** platforms
7. **Avoid deprecated methods** - Use modern equivalents marked in `@deprecated` tags
8. **No arbitrary delays** - Replace `TestHelpers.delay()` with proper waiting
9. **Follow best practices** - See the Best Practices section above
10. **Code review checklist** - Ensure all items are addressed before submitting

## 📞 Support

For framework questions or issues:

1. Review Best Practices section for common patterns and anti-patterns
2. Check migration guide above for legacy equivalents
3. Examine TypeScript types for available options
4. Look at existing tests for usage patterns
5. Check `@deprecated` tags in legacy methods for modern replacements
6. Review the comprehensive examples in this README

The framework is designed to be self-documenting through TypeScript types and comprehensive error messages.

## 🚨 Troubleshooting

### Performance Issues

#### **Element State Checking Configuration**
- **Default behavior**: `checkVisibility: true`, `checkEnabled: true`, `checkStability: false`
- **Performance optimization**: Stability checking disabled by default for better performance
- **When to enable stability**: Complex animations, moving screens, carousel components
- **When to disable checks**: Loading states, temporarily disabled elements
- **Examples**:
  ```typescript
  // Default: checks visibility + enabled, skips stability
  await Gestures.tap(button, { description: 'tap button' });
  
  // Enable stability for animated elements
  await Gestures.tap(carouselItem, { 
    checkStability: true,
    description: 'tap carousel item'
  });
  
  // Skip checks for loading/processing elements
  await Gestures.tap(processingButton, { 
    checkVisibility: false,
    checkEnabled: false,
    description: 'tap processing button'
  });
  ```

### Retry Mechanism Best Practices

#### **Framework vs Manual Retries**
- **Use framework retries**: `Gestures.tap()`, `Assertions.expectVisible()` have built-in retries
- **Avoid manual retries**: Don't wrap framework methods in additional retry loops
- **Example**:
  ```typescript
  // ❌ DON'T: Manual retry around framework method
  let attempts = 0;
  while (attempts < 5) {
    try {
      await Gestures.tap(button); // Already has retry logic
      break;
    } catch {
      attempts++;
    }
  }
  
  // ✅ DO: Use framework retry with proper configuration
  await Gestures.tap(button, { 
    timeout: 10000, 
    description: 'tap submit button' 
  });
  ```

#### **Timeout Configuration Strategy**
- **Quick operations**: Use default timeouts (15s)
- **Slow operations**: Increase timeout, don't add delays
- **Example**:
  ```typescript
  // ❌ DON'T: Add arbitrary delays
  await TestHelpers.delay(5000);
  await Gestures.tap(button);
  
  // ✅ DO: Use appropriate timeout for slow-loading elements
  await Gestures.tap(slowLoadingButton, { timeout: 30000 });
  ```

#### **"Element not enabled" Errors**
- **Cause**: Element exists but is not interactive (disabled/loading state)
- **Root cause**: Framework checks element is both visible AND enabled before interaction by default
- **Solution**: Use `checkEnabled: false` to bypass enabled state validation
- **When to use**: Elements that are temporarily disabled during processing, loading states, or elements that appear disabled but should still be interactable (i.e Account List item which is not yet selected)
- **Example**:
  ```typescript
  // Default: checks visibility + enabled + stability (if enabled)
  await Gestures.tap(element, { description: 'tap interactive element' });
  
  // Skip enabled check for temporarily disabled elements
  await Gestures.tap(loadingButton, { 
    checkEnabled: false,
    description: 'tap button during loading' 
  });
  
  // Skip all checks for special cases
  await Gestures.tap(processingButton, { 
    checkVisibility: false,
    checkEnabled: false,
    description: 'tap button during processing' 
  });
  ```
  
#### **"Element moving/animating" Errors**
- **Cause**: UI animations interfering with interactions
- **Solution**: Enable stability checking for that specific interaction
- **Example**:
  ```typescript
  await Gestures.tap(animatedButton, {
    checkStability: true,  // Wait for animations to complete
    description: 'tap animated button'
  });
  ```

### Common Issues and Solutions:

- **"Test is flaky"** → Remove `TestHelpers.delay()`, use proper assertions with timeouts
- **"Element not found"** → Use framework retry mechanisms and proper element selectors  
- **"Deprecated method warning"** → Check `@deprecated` tag for modern replacement
- **"Test is slow"** → Avoid nested retries, use appropriate timeouts, use `checkStability: true` only when needed
- **"Hard to maintain"** → Implement Page Object pattern, avoid repeated selectors
- **"Timeouts not working as expected"** → Check for nested retry patterns, use single-level framework retries

#### **Handling Flaky Navigation/Tap Issues**

**Problem**: Element tap succeeds but doesn't trigger navigation or expected action (common with buttons that sometimes don't respond to taps due to obscuration or timing issues).

**Solution**: Use higher-level retry pattern that wraps both the action and verification:

```typescript
// ✅ DO: Wrap tap + verification in single retry operation
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

**Why this works**:
- **Fast inner timeouts (2s)** - Prevents long waits when tap doesn't trigger navigation
- **Outer retry logic** - Handles the flaky tap scenario by retrying the entire flow
- **Total timeout control** - 30s outer timeout gives reasonable overall time limit
- **Clear failure modes** - Each step fails fast, allowing quick retry of the whole operation

**When to use this pattern**:
- Buttons that sometimes don't respond (obscuration issues)
- Navigation taps that may fail silently
- Actions that require verification of success (screen transitions)
- Complex interactions where multiple steps must succeed together