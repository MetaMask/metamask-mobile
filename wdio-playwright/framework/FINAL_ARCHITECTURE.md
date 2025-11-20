# Final Architecture - Unified E2E Framework

## Overview

A clean, layered architecture for writing page objects that work with **both Detox and WebdriverIO**.

## Architecture Layers

### Complete Stack

```
┌─────────────────────────────────────────────────────────────┐
│              Page Objects (Your Code)                       │
│       - LoginView, SettingsView, etc.                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────┐
        │   Element Locators (encapsulated)   │
        │     detox: () => Matchers...        │
        │     appium: () => PlaywrightMatchers│
        └─────────────────────────────────────┘
                              ↓
                  ┌───────────┴───────────┐
                  ↓                       ↓
        ┌─────────────────┐     ┌──────────────────┐
        │  DetoxElement   │     │ PlaywrightElement │
        │  (Promise)      │     │  (Promise)        │
        └─────────────────┘     └──────────────────┘
                  ↓                       ↓
        ┌─────────────────┐     ┌──────────────────┐
        │    Matchers     │     │PlaywrightMatchers│
        │    (Detox)      │     │  (WebdriverIO)   │
        │  - getByID      │     │  - getByXPath    │
        │  - getByText    │     │  - getByText     │
        │  - getByLabel   │     │  - getByAccessID │
        └─────────────────┘     └──────────────────┘
                              ↓
        ┌─────────────────────────────────────┐
        │         UnifiedGestures             │
        │   (Framework Detection & Routing)   │
        └─────────────────────────────────────┘
                              ↓
                  ┌───────────┴───────────┐
                  ↓                       ↓
        ┌─────────────────┐     ┌──────────────────┐
        │    Gestures     │     │PlaywrightGestures│
        │    (Detox)      │     │  (WebdriverIO)   │
        │  - Retries      │     │ - Simple wrappers│
        │  - Stability    │     │ - Can enhance    │
        │  - Logging      │     │   later          │
        └─────────────────┘     └──────────────────┘
                              ↓
        ┌─────────────────────────────────────┐
        │      Detox / WebdriverIO APIs       │
        │   (Native element interactions)     │
        └─────────────────────────────────────┘
```

### Locator Flow in Detail

```
Page Object Getter
       ↓
encapsulated({
  detox: () => Matchers.getElementByID('my-id'),      ← Function
  appium: () => PlaywrightMatchers.getByXPath('...')  ← Function
})
       ↓
FrameworkDetector.detect()
       ↓
  ┌────┴─────┐
  ↓          ↓
DETOX      APPIUM
  ↓          ↓
Execute    Execute
detox()    appium()
  ↓          ↓
Matchers   PlaywrightMatchers
.getByID   .getByXPath
  ↓          ↓
element(   driver.$
by.id())   (xpath)
  ↓          ↓
Returns    Returns
DetoxElement  Promise<PlaywrightElement>
```

## Core Components

### 1. Element Locators (Function-Based) - The Foundation

**Pattern:**

```typescript
get passwordInput(): EncapsulatedElementType {
  return encapsulated({
    detox: () => Matchers.getElementByID('password-input'),
    appium: () => PlaywrightMatchers.getByXPath('//*[@resource-id="password-input"]'),
  });
}
```

**Locator Levels Explained:**

```
Level 1: Page Object Getter
         ↓
get passwordInput(): EncapsulatedElementType

Level 2: Encapsulated Configuration
         ↓
return encapsulated({
  detox: () => Matchers.getElementByID('password-input'),
  appium: () => PlaywrightMatchers.getByXPath('//*[@resource-id="password-input"]')
})

Level 3: Framework Detection
         ↓
FrameworkDetector.detect()
         ↓
    ┌────┴────┐
    ↓         ↓
  DETOX    APPIUM

Level 4: Execute Locator Function
         ↓         ↓
  detox()    appium()
         ↓         ↓
  Matchers   PlaywrightMatchers

Level 5: Find Element
         ↓         ↓
element(by.id)  driver.$(xpath)
         ↓         ↓
  DetoxElement  PlaywrightElement
```

**Key Points:**

- ✅ **Level 1-2:** Define once in page object
- ✅ **Level 3:** Automatic framework detection
- ✅ **Level 4-5:** Execute appropriate locator
- ✅ **Level 6 (Optional):** Unwrap for direct WebdriverIO access
- ✅ Use functions that return elements (lazy evaluation)
- ✅ Leverage existing `Matchers` helpers
- ✅ No new patterns to learn

**When to Use `unwrap()`:**

```typescript
// ✅ Most cases - use PlaywrightElement API
const elem = await asPlaywrightElement(LoginView.passwordInput);
await elem.fill('text');
await elem.click();

// ✅ When you need WebdriverIO-specific methods
const elem = await asPlaywrightElement(LoginView.passwordInput);
const wdioElem = elem.unwrap();
await wdioElem.touchAction([{ action: 'longPress', x: 100, y: 200 }]);
await wdioElem.moveTo({ xOffset: 50, yOffset: 50 });
await wdioElem.dragAndDrop(targetElement);
// Any ChainablePromiseElement method!
```

**Real Example with Values:**

```typescript
// Level 1: Page Object
get passwordInput(): EncapsulatedElementType {
  // Level 2: Encapsulated configuration
  return encapsulated({
    detox: () => Matchers.getElementByID('login-password-input'),
    appium: () => PlaywrightMatchers.getByXPath('//*[@resource-id="login-password-input"]')
  });
}

// When used in test:
await LoginView.enterPassword('MyPassword123');
         ↓
// Level 3: Framework detected = APPIUM
         ↓
// Level 4: Execute appium() function
         ↓
PlaywrightMatchers.getByXPath('//*[@resource-id="login-password-input"]')
         ↓
// Level 5: WebdriverIO finds element
         ↓
driver.$('//*[@resource-id="login-password-input"]')
         ↓
// Returns: PlaywrightElement wrapping the WebdriverIO element
         ↓
await elem.fill('MyPassword123');

// Optional Level 6: Unwrap for low-level access
         ↓
const wdioElement = elem.unwrap();
         ↓
// Direct WebdriverIO API access when needed
await wdioElement.touchAction([...]);
await wdioElement.moveTo();
await wdioElement.getAttribute('content-desc');
// ... any WebdriverIO ChainablePromiseElement method
```

### 2. UnifiedGestures (Routing Layer)

**Purpose:** Automatically detect framework and route to correct implementation.

**Pattern:**

```typescript
static async tap(element: EncapsulatedElementType): Promise<void> {
  if (FrameworkDetector.isDetox()) {
    await Gestures.tap(element as DetoxElement);
  } else {
    const elem = (await element) as PlaywrightElement;
    await PlaywrightGestures.tap(elem);
  }
}
```

**Key Points:**

- ✅ Framework detection encapsulated
- ✅ Proxies to appropriate implementation
- ✅ Clean API for page objects

### 3. PlaywrightGestures (WebdriverIO Wrapper)

**Purpose:** Wrapper around PlaywrightElement API, future enhancement point.

**Current:** Simple wrappers

```typescript
static async tap(elem: PlaywrightElement): Promise<void> {
  await elem.tap();
}
```

**Future:** Can add retries, stability, logging

```typescript
static async tap(elem: PlaywrightElement): Promise<void> {
  await Utilities.executeWithRetry(async () => {
    await elem.waitForDisplayed();
    await elem.tap();
  }, { timeout: 10000 });
}
```

## Usage Patterns

### Pattern 1: UnifiedGestures (Recommended for Simple Cases)

```typescript
class LoginView {
  get passwordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID('password'),
      appium: () =>
        PlaywrightMatchers.getByXPath('//*[@resource-id="password"]'),
    });
  }

  // Clean - no framework detection!
  async enterPassword(password: string): Promise<void> {
    await UnifiedGestures.replaceText(this.passwordInput, password);
  }

  async tapSubmit(): Promise<void> {
    await UnifiedGestures.tap(this.submitButton);
  }
}
```

### Pattern 2: Direct Gestures (For Complex Cases)

```typescript
class LoginView {
  // When you need framework-specific options
  async complexEntry(password: string): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      await Gestures.typeText(this.passwordInput as DetoxElement, password, {
        checkStability: true,
        clearFirst: true,
        hideKeyboard: true,
      });
    } else {
      const elem = (await this.passwordInput) as PlaywrightElement;
      await PlaywrightGestures.fill(elem, password);
      // Future: Add custom retry logic here
    }
  }
}
```

### Pattern 3: Mixed (Best of Both)

```typescript
class MyPage {
  // Simple actions - use UnifiedGestures
  async tapButton(): Promise<void> {
    await UnifiedGestures.tap(this.button);
  }

  // Complex actions - use direct Gestures
  async complexFlow(): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      await Gestures.tap(this.element as DetoxElement, {
        checkStability: true,
        timeout: 10000,
      });
    } else {
      // Direct PlaywrightGestures access
      const elem = (await this.element) as PlaywrightElement;
      await PlaywrightGestures.tap(elem);
    }
  }
}
```

## Benefits

### ✅ Clean Code

**Before:**

```typescript
async tap(): Promise<void> {
  const elem = this.button;
  if (FrameworkDetector.isDetox()) {
    await Gestures.tap(elem as DetoxElement);
  } else {
    await (await elem).tap();
  }
}
```

**After:**

```typescript
async tap(): Promise<void> {
  await UnifiedGestures.tap(this.button);
}
```

### ✅ Future-Proof

Enhance `PlaywrightGestures` later without touching page objects:

```typescript
// Add retries to PlaywrightGestures.tap()
// All page objects using UnifiedGestures.tap() automatically benefit!
```

### ✅ Flexible

Mix and match approaches based on complexity:

- Simple → `UnifiedGestures`
- Complex → Direct `Gestures` or `PlaywrightGestures`

### ✅ Consistent

Same patterns as existing Detox framework:

- `Gestures.tap()` → familiar
- `PlaywrightGestures.tap()` → mirrors the structure
- `UnifiedGestures.tap()` → works everywhere

## When To Use What

| Use Case                         | Approach                    | Why                            |
| -------------------------------- | --------------------------- | ------------------------------ |
| Simple tap/fill                  | `UnifiedGestures`           | Clean, no framework detection  |
| Need Detox options               | Direct `Gestures`           | Access to checkStability, etc. |
| Need custom WebdriverIO behavior | Direct `PlaywrightGestures` | Full control                   |
| Most page object methods         | `UnifiedGestures`           | Clean code, easy to read       |

## Example Files

- **`LoginView.unified.example.ts`** - Using UnifiedGestures (cleanest)
- **`LoginView.ts`** - Manual framework detection
- **`PlaywrightGestures.ts`** - WebdriverIO gesture wrappers
- **`UnifiedGestures.ts`** - Framework-agnostic routing

## Key Takeaways

1. **Function-based locators** - Use `() => Matchers.getElementByID(...)`
2. **UnifiedGestures for simplicity** - Clean page objects
3. **Direct Gestures for control** - When you need it
4. **PlaywrightGestures is extensible** - Add retries/stability later

## Summary

✅ **Clean page objects** with `UnifiedGestures`  
✅ **No complex imports** - Simple, clean code  
✅ **Framework detection handled** - In UnifiedGestures layer  
✅ **Future-proof** - Enhance PlaywrightGestures without breaking page objects  
✅ **Flexible** - Direct access when needed

---

**Result:** Clean, maintainable, extensible test framework! 🎉
