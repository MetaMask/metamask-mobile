# Migrate off UnifiedGestures → Gestures

## Why

`Gestures` is the **canonical** interaction API for Appium smoke. `UnifiedGestures` is a legacy dual-runner facade. New page objects and specs must use `Gestures` only (ESLint enforces this: error in smoke specs, warn in page objects).

On Appium, `Gestures` already delegates to the Appium strategy — calling `UnifiedGestures` from page objects is redundant and confusing for agents/humans.

## Migration steps (existing POs)

### 1. Change the import

```typescript
// Before
import UnifiedGestures from '../../framework/UnifiedGestures';
// or
import { UnifiedGestures } from '../../framework';

// After
import Gestures from '../../framework/Gestures';
// or
import { Gestures } from '../../framework';
```

### 2. Rename call sites

| Before                                 | After                           |
| -------------------------------------- | ------------------------------- |
| `UnifiedGestures.tap(...)`             | `Gestures.tap(...)`             |
| `UnifiedGestures.waitAndTap(...)`      | `Gestures.waitAndTap(...)`      |
| `UnifiedGestures.typeText(...)`        | `Gestures.typeText(...)`        |
| `UnifiedGestures.replaceText(...)`     | `Gestures.replaceText(...)`     |
| `UnifiedGestures.swipe(...)`           | `Gestures.swipe(...)`           |
| `UnifiedGestures.scrollToElement(...)` | `Gestures.scrollToElement(...)` |
| `UnifiedGestures.longPress(...)`       | `Gestures.longPress(...)`       |
| `UnifiedGestures.dblTap(...)`          | `Gestures.dblTap(...)`          |
| `UnifiedGestures.tapAtPoint(...)`      | `Gestures.tapAtPoint(...)`      |
| `UnifiedGestures.tapAtIndex(...)`      | `Gestures.tapAtIndex(...)`      |

### 3. Option naming

Prefer Gestures option names already used in the codebase (`elemDescription`, etc.). If a call used Unified-only `description`, map it to the Gestures equivalent used by neighboring methods in the same file.

## Do not

- Do not add new `UnifiedGestures` imports.
- Do not remove the `UnifiedGestures` export from `tests/framework/index.ts` until Phase 2 cleanup (breaks remaining call sites and `Gestures` internals).
- Full repo-wide codemod is **Phase 3** (Element API) after Detox removal (MMQA-2230).

## Canonical docs

- [docs/testing/e2e-testing.md](../../docs/testing/e2e-testing.md)
- [docs/testing/appium-smoke-testing.md](../../docs/testing/appium-smoke-testing.md)
