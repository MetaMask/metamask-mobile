# E2E Framework ESLint Rules

This document describes the ESLint rules configured for the MetaMask Mobile E2E testing framework. These rules use ESLint's built-in `no-restricted-syntax` to help enforce best practices and guide developers away from anti-patterns.

## Available Rules

### `no-test-helpers-delay` ⚠️

**Problem**: Warns against using `TestHelpers.delay()` and arbitrary `setTimeout()` in tests.

**Why**: These create flaky, slow tests. The framework provides better waiting mechanisms.

**Examples**:

```javascript
// ❌ BAD: Will trigger warning
await TestHelpers.delay(5000);
await new Promise(resolve => setTimeout(resolve, 3000));

// ✅ GOOD: Use proper waiting
await Assertions.expectVisible(element, {
  timeout: 5000,
  description: 'element should appear'
});
```

### `no-deprecated-methods` ⚠️

**Problem**: Warns when using deprecated framework methods.

**Why**: Deprecated methods lack retry logic, stability checking, and descriptive error messages.

**Examples**:

```javascript
// ❌ BAD: Will trigger warning
await Assertions.checkIfVisible(element, 15000);
await Gestures.tapAndLongPress(element, 2000);

// ✅ GOOD: Use modern equivalents
await Assertions.expectVisible(element, {
  timeout: 15000,
  description: 'element should be visible'
});
await Gestures.longPress(element, {
  duration: 2000,
  description: 'long press element'
});
```

### `require-description-parameter` ⚠️

**Problem**: Encourages adding descriptive messages to framework method calls.

**Why**: Descriptive messages make test failures much easier to debug.

**Examples**:

```javascript
// ⚠️ WARNING: Missing description
await Assertions.expectVisible(button);

// ⚠️ WARNING: Generic description
await Gestures.tap(button, { description: 'tap' });

// ✅ GOOD: Descriptive message
await Assertions.expectVisible(button, {
  description: 'submit button should be visible after form validation'
});
await Gestures.tap(button, {
  description: 'tap submit button to send transaction'
});
```

### `no-legacy-detox-patterns` ⚠️

**Problem**: Suggests using framework methods instead of raw Detox calls.

**Why**: Framework methods provide automatic retries, stability checking, and better error messages.

**Examples**:

```javascript
// ⚠️ WARNING: Raw Detox usage
await waitFor(element(by.id('button'))).toBeVisible();
await element(by.id('button')).tap();

// ✅ GOOD: Framework methods
await Assertions.expectVisible(
  Matchers.getElementByID('button'),
  { description: 'button should be visible' }
);
await Gestures.tap(
  Matchers.getElementByID('button'),
  { description: 'tap button' }
);
```

## Rule Configuration

All rules are currently set to `warn` level to help with adoption. They are implemented using ESLint's `no-restricted-syntax` rule with custom selectors.
Once the team has adopted the modern patterns, and we have less flakiness, rules can be upgraded to errors:


```javascript
// In .eslintrc.js
{
  files: ['e2e/**/*.{js,ts}'],
  rules: {
    'no-restricted-syntax': [
      'warn',
      {
        selector: "CallExpression[callee.object.name='TestHelpers'][callee.property.name='delay']",
        message: 'Avoid TestHelpers.delay(). Use proper waiting with Assertions.expectVisible() or similar framework methods instead.',
      },
      {
        selector: "CallExpression[callee.name='setTimeout']",
        message: 'Avoid arbitrary setTimeout() in tests. Use framework waiting methods with proper conditions instead.',
      },
      {
        selector: "CallExpression[callee.object.name='Assertions'][callee.property.name='checkIfVisible']",
        message: 'Deprecated: "checkIfVisible" is deprecated. Use "expectVisible" instead for better error handling and retry mechanisms.',
      },
      // ... more deprecated method patterns
    ],
  }
}
```

```

## Running the Linter

```bash
# Lint all E2E files
yarn lint e2e/

# Fix auto-fixable issues
yarn lint:fix e2e/

# Lint specific file
yarn lint e2e/specs/onboarding/create-wallet.spec.js
```

## Disabling Rules

If you need to disable a rule for a specific case, use ESLint disable comments:

```javascript
// Disable for single line
await TestHelpers.delay(1000); // eslint-disable-line no-restricted-syntax

// Disable for block
/* eslint-disable no-restricted-syntax */
await Assertions.checkIfVisible(element);
/* eslint-enable no-restricted-syntax */
```

**Note**: Only disable rules when absolutely necessary and document why the modern pattern cannot be used.

## Benefits

- **Consistent Code Quality**: Enforces modern framework patterns across all E2E tests
- **Better Test Reliability**: Guides away from flaky patterns like arbitrary delays
- **Improved Debugging**: Encourages descriptive error messages
- **Team Onboarding**: Helps new team members learn best practices automatically
- **Gradual Migration**: Warnings allow existing code to work while encouraging improvements