# WebdriverIO + Unified Framework Overview

## What's in This Directory

This directory contains the **WebdriverIO/Playwright POC** and the **Unified Framework** that enables page objects to work with both Detox and WebdriverIO.

## Directory Structure

```
wdio-playwright/
├── framework/              # All framework code
│   ├── PlaywrightAdapter.ts
│   ├── PlaywrightMatchers.ts
│   ├── PlaywrightGestures.ts
│   ├── EncapsulatedElement.ts
│   └── UnifiedGestures.ts
├── tests/                  # Your tests
├── fixture/                # Playwright fixtures
├── services/               # Device providers
├── config/                 # Configuration
└── playwright.config.ts    # Playwright config
```

## Framework Components

### WebdriverIO Components

**PlaywrightAdapter** - Wraps WebdriverIO with Playwright-style API  
**PlaywrightMatchers** - Element locators  
**PlaywrightGestures** - Gesture helpers (extensible)

### Unified Framework Components

**EncapsulatedElement** - Function-based locators for both frameworks  
**UnifiedGestures** - Framework-agnostic gesture methods  
**Type Helpers** - Full autocomplete in tests

## Quick Start

### 1. Write a Page Object

```typescript
import {
  encapsulated,
  EncapsulatedElementType,
  PlaywrightMatchers,
} from '../../../wdio-playwright/framework';
import Matchers from '../../framework/Matchers';

class MyPage {
  get myButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('my-button'),
      appium: () =>
        PlaywrightMatchers.getByXPath('//*[@resource-id="my-button"]'),
    });
  }
}
```

### 2. Write a Test

```typescript
import { test } from '../fixture';
import { asPlaywrightElement } from '../framework';
import MyPage from '../../e2e/pages/MyPage';

test('my test', async ({ driver }) => {
  // IMPORTANT: Always use { driver } parameter!

  // Option 1: Use page object methods
  await MyPage.tapButton();

  // Option 2: Direct element access with full autocomplete
  const elem = await asPlaywrightElement(MyPage.myButton);
  await elem.click(); // Full autocomplete!
});
```

## Documentation

📚 **See [framework/README.md](./framework/README.md)** for complete documentation index.

## Key Takeaways

✅ **Function-based locators** - Use `() => Matchers.getElementByID(...)`  
✅ **Always use { driver }** - Required for fixture setup  
✅ **Use asPlaywrightElement()** - For full autocomplete  
✅ **UnifiedGestures** - Clean action methods  
✅ **Future-proof** - Extend PlaywrightGestures later

## Import Paths

### In Tests

```typescript
import { asPlaywrightElement, UnifiedGestures } from '../framework';
import { test } from '../fixture';
```

### In Page Objects (e2e/pages/)

```typescript
import {
  encapsulated,
  EncapsulatedElementType,
  FrameworkDetector,
  PlaywrightMatchers,
} from '../../../wdio-playwright/framework';
```

## Files Moved Here

All unified framework files are now in `wdio-playwright/framework/` to keep the POC separated from the main Detox e2e framework.

---

**Everything you need for the WebdriverIO POC is in this directory!** 🎉
