# E2E Architecture (Appium)

## Overview

Page objects and smoke specs target **Appium + Playwright** (`tests/smoke-appium/`). Use the canonical facades from `tests/framework/index.ts`:

- `Matchers` — element locators
- `Gestures` — taps, typing, swipes, scrolls
- `Assertions` — waits and expectations

Do **not** import `UnifiedGestures` in page objects or specs. It remains an internal dual-runner implementation detail used by `Gestures` on Appium until Detox removal is complete.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Page Objects (Your Code) │
│ - LoginView, SettingsView, etc. │
└─────────────────────────────────────────────────────────────┘
↓
Matchers / Gestures / Assertions
↓
Appium (Playwright) adapters & strategies
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
- Different selector strategy → `encapsulated({ appium: () => ... })` (legacy `detox` key may still exist for unmigrated suites; new work should not add Detox branches)
- Structurally different action flow → `encapsulatedAction({ appium: async () => ... })`

Canonical guide: [docs/testing/e2e-testing.md](../../docs/testing/e2e-testing.md).
Runbook: [docs/testing/appium-smoke-testing.md](../../docs/testing/appium-smoke-testing.md).
