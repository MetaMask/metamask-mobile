# Unified Gestures Migration Guide

## Overview

`UnifiedGestures` is a static facade that lets page objects execute gestures without knowing whether Detox or Appium/WebdriverIO is running. It uses the **Strategy pattern**: a single `GestureStrategy` interface with two implementations (`DetoxGestureStrategy` and `AppiumGestureStrategy`), selected once at startup.

```
Page Objects  →  UnifiedGestures (static)  →  GestureStrategy (interface)
                                                  ├── DetoxGestureStrategy   → Gestures (existing)
                                                  └── AppiumGestureStrategy  → PlaywrightElement / PlaywrightGestures
```

This is the **action** counterpart to `encapsulated()` (which handles element locators). Together they let you write fully framework-agnostic page objects.

## Available Methods

| Method                                       | Description                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `tap(elem, opts?)`                           | Tap an element                                                                 |
| `waitAndTap(elem, opts?)`                    | Wait for visibility then tap                                                   |
| `typeText(elem, text, opts?)`                | Clear field and type text                                                      |
| `replaceText(elem, text, opts?)`             | Replace existing text                                                          |
| `swipe(elem, direction, opts?)`              | Swipe in a direction                                                           |
| `scrollToElement(target, scrollView, opts?)` | Scroll until target is visible                                                 |
| `longPress(elem, opts?)`                     | Long press an element                                                          |
| `dblTap(elem, opts?)`                        | Double tap an element                                                          |
| `tapAtPoint(elem, point, opts?)`             | Tap at specific {x, y} coordinates on an element                               |
| `tapAtIndex(elem, index, opts?)`             | Tap the nth matching element (accepts single element or `PlaywrightElement[]`) |

All methods accept optional `UnifiedGestureOptions`:

```typescript
interface UnifiedGestureOptions {
  timeout?: number; // Max wait time in ms
  description?: string; // For logging / error messages
}
```

## Migration Steps

### 1. Update element getters to use `encapsulated()`

If your page object still uses Detox-only matchers, convert them first:

```typescript
// Before
get passwordInput(): DetoxElement {
  return Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT);
}

// After
get passwordInput(): EncapsulatedElementType {
  return encapsulated({
    detox: () => Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT),
    appium: () => PlaywrightMatchers.getElementById(LoginViewSelectors.PASSWORD_INPUT),
  });
}
```

### 2. Replace `Gestures.*` calls with `UnifiedGestures.*`

```typescript
// Before
import { Gestures } from '../../framework';

async enterPassword(password: string) {
  await Gestures.typeText(this.passwordInput, password, {
    hideKeyboard: true,
    elemDescription: 'password field',
  });
}

// After
import { UnifiedGestures } from '../../framework';

async enterPassword(password: string) {
  await UnifiedGestures.typeText(this.passwordInput, password, {
    description: 'password field',
  });
}
```

Framework-specific options like `hideKeyboard`, `checkStability`, and `clearFirst` are handled internally by each strategy with sensible defaults:

- **Detox**: `hideKeyboard: true`, `clearFirst: true`, retry + stability checks
- **Appium**: Direct `PlaywrightElement` / `PlaywrightGestures` calls (e.g. `fill()`, `click()`)

### 3. Handle edge cases with `encapsulatedAction()`

For the rare ~3% of methods where Detox and Appium need structurally different flows:

```typescript
import { encapsulatedAction } from '../../framework';

async dismissOnboarding() {
  await encapsulatedAction({
    detox: async () => {
      await Gestures.swipe(this.overlay, 'up');
      await Gestures.tap(this.dismissButton);
    },
    appium: async () => {
      const btn = await asPlaywrightElement(this.dismissButton);
      await btn.click();
    },
  });
}
```

Both `detox` and `appium` branches are **optional** — you can provide only one when the method only exists for a single framework. This is useful during incremental migration when porting a method that has no equivalent on the other side:

```typescript
// Only the appium branch is needed — Detox doesn't have this flow
async waitForScreenToDisplay() {
  await encapsulatedAction({
    appium: async () => {
      const element = await asPlaywrightElement(this.title);
      await element.waitForDisplayed({ timeout: 15000 });
    },
  });
}
```

If the active framework doesn't have a matching branch, `encapsulatedAction` throws an error to catch misconfiguration early.

## Escape Hatch

When the unified approach becomes overly complex for a specific case, you can always use `FrameworkDetector` or `PlatformDetector` directly for custom conditional logic:

```typescript
import { FrameworkDetector } from '../../framework';

async complexSpecialCase() {
  if (FrameworkDetector.isDetox()) {
    // Detox-specific multi-step flow
  } else {
    // Appium-specific multi-step flow
  }
}
```

This should be the last resort. Prefer `UnifiedGestures` > `encapsulatedAction()` > direct `FrameworkDetector` checks, in that order.

## Full Before/After Example

### Before (Detox-only)

```typescript
import { Gestures, Matchers } from '../../framework';
import { LoginViewSelectors } from '../../selectors/LoginView.selectors';

class LoginView {
  get passwordInput(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT);
  }

  get loginButton(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.LOGIN_BUTTON);
  }

  async login(password: string) {
    await Gestures.typeText(this.passwordInput, password, {
      hideKeyboard: true,
      elemDescription: 'password input',
    });
    await Gestures.waitAndTap(this.loginButton, {
      elemDescription: 'login button',
    });
  }
}
```

### After (Unified)

```typescript
import { UnifiedGestures } from '../../framework';
import {
  encapsulated,
  EncapsulatedElementType,
  Matchers,
  PlaywrightMatchers,
} from '../../framework';
import { LoginViewSelectors } from '../../selectors/LoginView.selectors';

class LoginView {
  get passwordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(LoginViewSelectors.PASSWORD_INPUT),
    });
  }

  get loginButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(LoginViewSelectors.LOGIN_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(LoginViewSelectors.LOGIN_BUTTON),
    });
  }

  async login(password: string) {
    await UnifiedGestures.typeText(this.passwordInput, password, {
      description: 'password input',
    });
    await UnifiedGestures.waitAndTap(this.loginButton, {
      description: 'login button',
    });
  }
}
```

## FAQ

**Q: Does this change existing Detox test behavior?**
No. `DetoxGestureStrategy` wraps the existing `Gestures` class — all retry logic, stability checks, and platform-specific scroll behavior are preserved.

**Q: What if I need a Detox-specific option like `checkStability`?**
Use `encapsulatedAction()` and call `Gestures` directly in the Detox branch.

**Q: Can I still use `Gestures` directly?**
Yes. The `Gestures` class is not removed or modified. For Detox-only page objects that haven't been migrated, `Gestures` works exactly as before.
