# E2E Architecture (Appium)

## Overview

Page objects and smoke specs target **Appium + Playwright** (`tests/smoke-appium/`). Use the canonical facades from `tests/framework/index.ts`:

- `Matchers` — element locators (`Promise<AppiumElement>`)
- `Gestures` — taps, typing, swipes, scrolls
- `Assertions` — waits and expectations
- `AppiumElement` — canonical matcher/gesture element type

Do **not** import `AppiumGestures` in page objects or specs. Use `Gestures` from `tests/framework`.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Page Objects (Your Code) │
│ - LoginView, SettingsView, etc. │
└─────────────────────────────────────────────────────────────┘
↓
Matchers / Gestures / Assertions
↓
AppiumGestures / AppiumElement
↓
Device / emulator APIs
```

## Default page object pattern

```typescript
import Matchers from '../framework/Matchers';
import Gestures from '../framework/Gestures';
import Assertions from '../framework/Assertions';

class LoginPage {
  get passwordInput() {
    return Matchers.getElementByID('login-password-input');
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.passwordInput, password, {
      elemDescription: 'password input',
    });
  }
}

export default new LoginPage();
```

## When to branch

Prefer the same `Matchers` / `Gestures` / `Assertions` call for iOS and Android.

- Different testID / platform locator → `resolve({ testID, iosAppiumTestID, ... })`
- Different selector strategy → `encapsulated(() => ...)` or `encapsulated({ android, ios })`
- Structurally different action flow → `PlatformDetector` + `Gestures` / `Assertions` in the page object

Canonical guide: [docs/testing/e2e-testing.md](../../docs/testing/e2e-testing.md).  
Runbook: [docs/testing/appium-smoke-testing.md](../../docs/testing/appium-smoke-testing.md).
