# Ramps Buy Session State Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move headless buy session orchestration into `RampsController` so that `startHeadlessBuy` no longer needs `useNavigation()` context, and the navigation trigger is driven by observable controller state rather than an imperative React Navigation call.

**Architecture:** Add a `buySession` field (serializable, `persist: false`) to `RampsControllerState` with three lifecycle methods: `startBuySession`, `terminateBuySession`, `clearBuySession`. On mobile, a zero-render `RampsSessionPresenter` watches this state and calls `NavigationService` to navigate to `HeadlessHost` — decoupling the session start from any React Navigation context. The existing `sessionRegistry` (non-serializable callbacks) stays in mobile; only the observable status travels through the controller.

**Tech Stack:** TypeScript, `@metamask/base-controller`, Jest (core); React Native, Redux, `useSelector`, `NavigationService` (mobile)

---

## Repo 1 — Core (`/Users/amitabh/Dev/consensys/core`)

**Branch:** `feat/ramps-buy-session-state` off `feat/ramps-best-provider-quote`

```bash
cd /Users/amitabh/Dev/consensys/core
git checkout feat/ramps-best-provider-quote
git checkout -b feat/ramps-buy-session-state
```

---

### Task 1: Add `RampsBuySessionState` type + `buySession` to controller state

**Files:**
- Modify: `packages/ramps-controller/src/RampsController.ts`
- Modify: `packages/ramps-controller/src/RampsController.test.ts`

- [ ] **Step 1: Write failing test for the new state shape and default value**

In `packages/ramps-controller/src/RampsController.test.ts`, inside the `describe('constructor')` block, add:

```typescript
it('includes buySession with status idle in default state', async () => {
  await withController(({ controller }) => {
    expect(controller.state.buySession).toStrictEqual({ status: 'idle' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
yarn workspace @metamask/ramps-controller run jest --no-coverage RampsController.test.ts -t "includes buySession"
```
Expected: FAIL — `state.buySession` is undefined.

- [ ] **Step 3: Add the type and state field**

In `RampsController.ts`, after the `NativeProvidersState` type block (~line 324), add:

```typescript
/**
 * Serializable status of an in-progress headless buy session.
 * Non-serializable callbacks stay in mobile's sessionRegistry.
 * persist: false — sessions do not survive app restart.
 */
export type RampsBuySessionState =
  | { status: 'idle' }
  | { status: 'active'; sessionId: string }
  | {
      status: 'terminal';
      sessionId: string;
      outcome: 'completed' | 'cancelled' | 'failed';
      orderId?: string;
      errorCode?: string;
    };
```

In `RampsControllerState` (the type, ~line 329), add at the end:
```typescript
  /**
   * Observable state of the current headless buy session.
   * Serializable subset only — callbacks live in mobile's sessionRegistry.
   */
  buySession: RampsBuySessionState;
```

In `rampsControllerMetadata` (~line 383), add:
```typescript
  buySession: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
```

In `getDefaultRampsControllerState()` (~line 469), add to the returned object:
```typescript
    buySession: { status: 'idle' } as RampsBuySessionState,
```

- [ ] **Step 4: Update the two `toMatchInlineSnapshot` tests that will now fail**

The tests at `describe('constructor') > 'uses default state when no state is provided'` and `'fills in missing initial state with defaults'` both use `toMatchInlineSnapshot` with a hardcoded object. Adding `buySession` breaks them. Update each snapshot to include:

```
"buySession": {
  "status": "idle",
},
```

Place it at the top of each inline snapshot object (alphabetical order — `b` before `c`).

- [ ] **Step 5: Run the constructor tests to verify they pass**

```bash
yarn workspace @metamask/ramps-controller run jest --no-coverage RampsController.test.ts -t "constructor"
```
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ramps-controller/src/RampsController.ts packages/ramps-controller/src/RampsController.test.ts
git commit -m "feat(ramps-controller): add RampsBuySessionState type and buySession field to state"
```

---

### Task 2: Add `startBuySession`, `terminateBuySession`, `clearBuySession` methods

**Files:**
- Modify: `packages/ramps-controller/src/RampsController.ts`
- Modify: `packages/ramps-controller/src/RampsController.test.ts`

- [ ] **Step 1: Write failing tests for all three methods**

In `RampsController.test.ts`, add a `describe('buy session lifecycle')` block. All tests use `withController` and are `async`:

```typescript
describe('buy session lifecycle', () => {
  describe('startBuySession', () => {
    it('sets buySession to active with the given sessionId', async () => {
      await withController(({ controller }) => {
        controller.startBuySession('session-abc');
        expect(controller.state.buySession).toStrictEqual({
          status: 'active',
          sessionId: 'session-abc',
        });
      });
    });

    it('replaces an existing active session', async () => {
      await withController(({ controller }) => {
        controller.startBuySession('session-1');
        controller.startBuySession('session-2');
        expect(controller.state.buySession).toStrictEqual({
          status: 'active',
          sessionId: 'session-2',
        });
      });
    });
  });

  describe('terminateBuySession', () => {
    it('sets buySession to terminal/completed with orderId', async () => {
      await withController(({ controller }) => {
        controller.startBuySession('session-abc');
        controller.terminateBuySession('session-abc', 'completed', { orderId: 'order-1' });
        expect(controller.state.buySession).toStrictEqual({
          status: 'terminal',
          sessionId: 'session-abc',
          outcome: 'completed',
          orderId: 'order-1',
        });
      });
    });

    it('sets buySession to terminal/cancelled', async () => {
      await withController(({ controller }) => {
        controller.startBuySession('session-abc');
        controller.terminateBuySession('session-abc', 'cancelled');
        expect(controller.state.buySession).toStrictEqual({
          status: 'terminal',
          sessionId: 'session-abc',
          outcome: 'cancelled',
        });
      });
    });

    it('sets buySession to terminal/failed with errorCode', async () => {
      await withController(({ controller }) => {
        controller.startBuySession('session-abc');
        controller.terminateBuySession('session-abc', 'failed', { errorCode: 'UNKNOWN' });
        expect(controller.state.buySession).toStrictEqual({
          status: 'terminal',
          sessionId: 'session-abc',
          outcome: 'failed',
          errorCode: 'UNKNOWN',
        });
      });
    });

    it('is a no-op when sessionId does not match active session', async () => {
      await withController(({ controller }) => {
        controller.startBuySession('session-abc');
        controller.terminateBuySession('session-wrong', 'cancelled');
        expect(controller.state.buySession).toStrictEqual({
          status: 'active',
          sessionId: 'session-abc',
        });
      });
    });

    it('is a no-op when session is already terminal', async () => {
      await withController(({ controller }) => {
        controller.startBuySession('session-abc');
        controller.terminateBuySession('session-abc', 'cancelled');
        controller.terminateBuySession('session-abc', 'completed', { orderId: 'order-1' });
        expect(controller.state.buySession).toStrictEqual({
          status: 'terminal',
          sessionId: 'session-abc',
          outcome: 'cancelled',
        });
      });
    });
  });

  describe('clearBuySession', () => {
    it('resets buySession to idle', async () => {
      await withController(({ controller }) => {
        controller.startBuySession('session-abc');
        controller.terminateBuySession('session-abc', 'completed', { orderId: 'order-1' });
        controller.clearBuySession();
        expect(controller.state.buySession).toStrictEqual({ status: 'idle' });
      });
    });

    it('is a no-op when session is already idle', async () => {
      await withController(({ controller }) => {
        controller.clearBuySession();
        expect(controller.state.buySession).toStrictEqual({ status: 'idle' });
      });
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
yarn workspace @metamask/ramps-controller run jest --no-coverage RampsController.test.ts -t "buy session lifecycle"
```
Expected: FAIL — methods not defined.

- [ ] **Step 3: Implement the three methods**

In `RampsController.ts`, add near other simple setter methods (e.g., after `setSelectedPaymentMethod`):

```typescript
/**
 * Marks a headless buy session as active. If another session is already
 * active, it is silently replaced (the previous session's callbacks are
 * the mobile layer's responsibility to clean up via sessionRegistry).
 *
 * @param sessionId - The id generated by mobile's sessionRegistry.
 */
startBuySession(sessionId: string): void {
  this.update((state) => {
    state.buySession = { status: 'active', sessionId };
  });
}

/**
 * Transitions the active session to terminal. No-op if the sessionId does
 * not match the current session or the session is already terminal.
 *
 * @param sessionId - The session to terminate (must match active session).
 * @param outcome - The terminal outcome.
 * @param options - Optional orderId (completed) or errorCode (failed).
 */
terminateBuySession(
  sessionId: string,
  outcome: 'completed' | 'cancelled' | 'failed',
  options?: { orderId?: string; errorCode?: string },
): void {
  this.update((state) => {
    const current = state.buySession;
    if (current.status !== 'active' || current.sessionId !== sessionId) {
      return;
    }
    state.buySession = {
      status: 'terminal',
      sessionId,
      outcome,
      ...(options?.orderId !== undefined && { orderId: options.orderId }),
      ...(options?.errorCode !== undefined && { errorCode: options.errorCode }),
    };
  });
}

/**
 * Resets buy session to idle. Call after the consumer has processed a
 * terminal session result (e.g. shown success/failure UI).
 */
clearBuySession(): void {
  this.update((state) => {
    state.buySession = { status: 'idle' };
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
yarn workspace @metamask/ramps-controller run jest --no-coverage RampsController.test.ts -t "buy session lifecycle"
```
Expected: all PASS.

- [ ] **Step 5: Run the full test suite to verify no regressions**

```bash
yarn workspace @metamask/ramps-controller run jest --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add packages/ramps-controller/src/RampsController.ts packages/ramps-controller/src/RampsController.test.ts
git commit -m "feat(ramps-controller): add startBuySession, terminateBuySession, clearBuySession methods"
```

---

### Task 3: Publish a `buySessionStateChanged` event

**Files:**
- Modify: `packages/ramps-controller/src/RampsController.ts`
- Modify: `packages/ramps-controller/src/RampsController.test.ts`

The mobile presenter needs to react to session changes without polling. Adding a dedicated event allows consumers to subscribe without watching all `stateChanged` diffs.

- [ ] **Step 1: Write failing tests for the event**

```typescript
describe('buySessionStateChanged event', () => {
  it('is published when startBuySession is called', async () => {
    await withController(async ({ controller, messenger }) => {
      const listener = jest.fn();
      messenger.subscribe('RampsController:buySessionStateChanged', listener);
      controller.startBuySession('session-abc');
      expect(listener).toHaveBeenCalledWith({ status: 'active', sessionId: 'session-abc' });
    });
  });

  it('is published when terminateBuySession transitions the session', async () => {
    await withController(async ({ controller, messenger }) => {
      const listener = jest.fn();
      controller.startBuySession('session-abc');
      messenger.subscribe('RampsController:buySessionStateChanged', listener);
      controller.terminateBuySession('session-abc', 'cancelled');
      expect(listener).toHaveBeenCalledWith({
        status: 'terminal',
        sessionId: 'session-abc',
        outcome: 'cancelled',
      });
    });
  });

  it('is published when clearBuySession is called', async () => {
    await withController(async ({ controller, messenger }) => {
      const listener = jest.fn();
      controller.startBuySession('session-abc');
      controller.terminateBuySession('session-abc', 'cancelled');
      messenger.subscribe('RampsController:buySessionStateChanged', listener);
      controller.clearBuySession();
      expect(listener).toHaveBeenCalledWith({ status: 'idle' });
    });
  });

  it('is NOT published when terminateBuySession is a no-op', async () => {
    await withController(async ({ controller, messenger }) => {
      const listener = jest.fn();
      controller.startBuySession('session-abc');
      messenger.subscribe('RampsController:buySessionStateChanged', listener);
      controller.terminateBuySession('wrong-id', 'cancelled');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
yarn workspace @metamask/ramps-controller run jest --no-coverage RampsController.test.ts -t "buySessionStateChanged"
```

- [ ] **Step 3: Add the event type**

In `RampsController.ts`, after `RampsControllerOrderStatusChangedEvent`:

```typescript
/**
 * Published whenever the buy session status transitions.
 * Consumed by mobile's RampsSessionPresenter to trigger navigation.
 */
export type RampsControllerBuySessionStateChangedEvent = {
  type: `${typeof controllerName}:buySessionStateChanged`;
  payload: [RampsBuySessionState];
};
```

Update `RampsControllerEvents` union:
```typescript
export type RampsControllerEvents =
  | RampsControllerStateChangeEvent
  | RampsControllerOrderStatusChangedEvent
  | RampsControllerBuySessionStateChangedEvent;
```

- [ ] **Step 4: Wire `messenger.publish` into each method**

Update `startBuySession`:
```typescript
startBuySession(sessionId: string): void {
  const next: RampsBuySessionState = { status: 'active', sessionId };
  this.update((state) => {
    state.buySession = next;
  });
  this.messenger.publish('RampsController:buySessionStateChanged', next);
}
```

Update `terminateBuySession` — track whether the update ran before publishing:
```typescript
terminateBuySession(
  sessionId: string,
  outcome: 'completed' | 'cancelled' | 'failed',
  options?: { orderId?: string; errorCode?: string },
): void {
  let next: RampsBuySessionState | undefined;
  this.update((state) => {
    const current = state.buySession;
    if (current.status !== 'active' || current.sessionId !== sessionId) {
      return;
    }
    next = {
      status: 'terminal',
      sessionId,
      outcome,
      ...(options?.orderId !== undefined && { orderId: options.orderId }),
      ...(options?.errorCode !== undefined && { errorCode: options.errorCode }),
    };
    state.buySession = next;
  });
  if (next) {
    this.messenger.publish('RampsController:buySessionStateChanged', next);
  }
}
```

Update `clearBuySession`:
```typescript
clearBuySession(): void {
  const next: RampsBuySessionState = { status: 'idle' };
  this.update((state) => {
    state.buySession = next;
  });
  this.messenger.publish('RampsController:buySessionStateChanged', next);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
yarn workspace @metamask/ramps-controller run jest --no-coverage RampsController.test.ts -t "buySessionStateChanged"
```

- [ ] **Step 6: Full suite green**

```bash
yarn workspace @metamask/ramps-controller run jest --no-coverage
```

- [ ] **Step 7: Commit**

```bash
git add packages/ramps-controller/src/RampsController.ts packages/ramps-controller/src/RampsController.test.ts
git commit -m "feat(ramps-controller): publish buySessionStateChanged event on session transitions"
```

---

### Task 4: Regenerate action types and update exports

**Files:**
- Modify: `packages/ramps-controller/src/RampsController-method-action-types.ts` (auto-generated)
- Modify: `packages/ramps-controller/src/index.ts`

- [ ] **Step 1: Regenerate action types**

```bash
yarn workspace @metamask/ramps-controller run messenger-action-types:generate
```

Verify the generated file now contains `RampsControllerStartBuySessionAction`, `RampsControllerTerminateBuySessionAction`, `RampsControllerClearBuySessionAction` and that the `RampsControllerMethodActions` union includes them.

- [ ] **Step 2: Update `index.ts` exports**

Add to `packages/ramps-controller/src/index.ts`:

```typescript
export type {
  RampsBuySessionState,
  RampsControllerBuySessionStateChangedEvent,
} from './RampsController';
export type {
  RampsControllerStartBuySessionAction,
  RampsControllerTerminateBuySessionAction,
  RampsControllerClearBuySessionAction,
} from './RampsController-method-action-types';
```

- [ ] **Step 3: Typecheck**

```bash
yarn workspace @metamask/ramps-controller run build
```
Expected: no TypeScript errors.

- [ ] **Step 4: Lint**

```bash
yarn workspace @metamask/ramps-controller run lint
```

- [ ] **Step 5: Commit**

```bash
git add packages/ramps-controller/src/RampsController-method-action-types.ts packages/ramps-controller/src/index.ts
git commit -m "feat(ramps-controller): export buy session types and regenerate action types"
```

---

### Task 5: Update CHANGELOG and validate

**Files:**
- Modify: `packages/ramps-controller/CHANGELOG.md`

- [ ] **Step 1: Add changelog entry under `## [Unreleased]`**

```markdown
### Added
- `RampsBuySessionState` type representing the serializable state of a headless buy session (`idle | active | terminal`)
- `buySession` field on `RampsControllerState` (`persist: false`)
- `startBuySession(sessionId)`, `terminateBuySession(sessionId, outcome, options?)`, `clearBuySession()` methods
- `RampsController:buySessionStateChanged` event published on every session transition
```

- [ ] **Step 2: Validate**

```bash
yarn workspace @metamask/ramps-controller run changelog:validate
```

- [ ] **Step 3: Commit**

```bash
git add packages/ramps-controller/CHANGELOG.md
git commit -m "docs(ramps-controller): add changelog entry for buy session state"
```

---

### Task 6: Trigger preview build

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/ramps-buy-session-state
```

- [ ] **Step 2: Open a draft PR against `feat/ramps-best-provider-quote`** (not main):

```bash
gh pr create \
  --title "feat(ramps-controller): add buy session state" \
  --base feat/ramps-best-provider-quote \
  --draft \
  --body "Adds serializable buy session state to RampsController. Preview build needed for mobile integration."
```

- [ ] **Step 3: Note the `@metamask-previews/ramps-controller` version from the preview build output.** You will need this for the mobile branch.

---

## Repo 2 — Mobile (`/Users/amitabh/Dev/consensys/metamask-mobile-test-money-account`)

**Branch:** `feat/ramps-session-presenter` off `test-money-account`

```bash
cd /Users/amitabh/Dev/consensys/metamask-mobile-test-money-account
git checkout test-money-account
git checkout -b feat/ramps-session-presenter
```

**Prerequisite:** Bump the preview package before starting:

```bash
yarn workspace metamask-mobile add @metamask/ramps-controller@npm:@metamask-previews/ramps-controller@<preview-version>
```

---

### Task 7: Register `buySessionStateChanged` in the mobile messenger

**Files:**
- Modify: `app/core/Engine/messengers/ramps-controller-messenger/ramps-controller-messenger.ts`

The event must be delegated from the root messenger so mobile code can subscribe to it.

- [ ] **Step 1: Update the first `rootMessenger.delegate` call** (the one with `events: []` at ~line 76)

Change:
```typescript
events: [],
```
To:
```typescript
events: ['RampsController:buySessionStateChanged'],
```

Also import `RampsControllerBuySessionStateChangedEvent` from `@metamask/ramps-controller` and add it to the `AllowedEvents` union for this messenger.

- [ ] **Step 2: Typecheck**

```bash
yarn lint:tsc
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/core/Engine/messengers/ramps-controller-messenger/ramps-controller-messenger.ts
git commit -m "feat(ramps): delegate buySessionStateChanged event in ramps-controller-messenger"
```

---

### Task 8: Add `selectBuySession` selector

**Files:**
- Modify: `app/selectors/rampsController/index.ts`
- Modify: `app/selectors/rampsController/index.test.ts`

- [ ] **Step 1: Write failing test** (use `createMockState` — the existing helper in `index.test.ts`):

```typescript
import { type RampsBuySessionState } from '@metamask/ramps-controller';

describe('selectBuySession', () => {
  it('returns idle when buySession is not set', () => {
    const state = createMockState({});
    expect(selectBuySession(state)).toStrictEqual({ status: 'idle' });
  });

  it('returns active session state', () => {
    const session: RampsBuySessionState = { status: 'active', sessionId: 'abc' };
    const state = createMockState({ buySession: session });
    expect(selectBuySession(state)).toStrictEqual(session);
  });

  it('returns terminal session state', () => {
    const session: RampsBuySessionState = {
      status: 'terminal',
      sessionId: 'abc',
      outcome: 'completed',
      orderId: 'order-1',
    };
    const state = createMockState({ buySession: session });
    expect(selectBuySession(state)).toStrictEqual(session);
  });
});
```

Note: `createMockState` does not include `buySession` in its defaults yet — it will need updating in Task 8 Step 3 or the test will fail on missing field rather than missing selector. Add `buySession: { status: 'idle' }` to the `RampsController` default object inside `createMockState`.

- [ ] **Step 2: Run to verify it fails**

```bash
yarn jest app/selectors/rampsController/index.test.ts -t "selectBuySession"
```

- [ ] **Step 3: Add the selector and update `createMockState`**

In `app/selectors/rampsController/index.ts`:

```typescript
import { type RampsBuySessionState } from '@metamask/ramps-controller';

export const selectBuySession = createSelector(
  selectRampsControllerState,
  (rampsState): RampsBuySessionState =>
    rampsState?.buySession ?? { status: 'idle' },
);
```

In `index.test.ts`, add `buySession: { status: 'idle' }` to the hardcoded `RampsController` object inside `createMockState` so the default state is valid.

- [ ] **Step 4: Run test to verify it passes**

```bash
yarn jest app/selectors/rampsController/index.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/selectors/rampsController/index.ts app/selectors/rampsController/index.test.ts
git commit -m "feat(ramps): add selectBuySession selector"
```

---

### Task 9: Create `RampsSessionPresenter`

**Files:**
- Create: `app/components/UI/Ramp/headless/RampsSessionPresenter.tsx`
- Create: `app/components/UI/Ramp/headless/RampsSessionPresenter.test.tsx`

The presenter is a zero-render component. It watches `buySession` from Redux and calls `NavigationService` when a session becomes active.

- [ ] **Step 1: Write failing tests** (use `configureStore` from `@reduxjs/toolkit`, the pattern from `RampsBootstrap.test.tsx`):

```typescript
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RampsSessionPresenter from './RampsSessionPresenter';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('../../../../core/NavigationService/NavigationService', () => ({
  navigation: { navigate: jest.fn() },
}));

const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

function makeStore(buySession: unknown) {
  return configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: { buySession },
        },
      }),
    },
  });
}

function renderPresenter(buySession: unknown) {
  const store = makeStore(buySession);
  return render(
    <Provider store={store}>
      <RampsSessionPresenter />
    </Provider>,
  );
}

describe('RampsSessionPresenter', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('renders nothing', () => {
    const { toJSON } = renderPresenter({ status: 'idle' });
    expect(toJSON()).toBeNull();
  });

  it('navigates to HEADLESS_ENTRY when session becomes active', async () => {
    await act(async () => {
      renderPresenter({ status: 'active', sessionId: 'session-abc' });
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.HEADLESS_ENTRY, {
      screen: Routes.RAMP.TOKEN_SELECTION_ROOT,
      params: {
        screen: Routes.RAMP.HEADLESS_HOST,
        params: { headlessSessionId: 'session-abc' },
      },
    });
  });

  it('does not navigate when session is idle', async () => {
    await act(async () => {
      renderPresenter({ status: 'idle' });
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when session is terminal', async () => {
    await act(async () => {
      renderPresenter({ status: 'terminal', sessionId: 'abc', outcome: 'cancelled' });
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
yarn jest app/components/UI/Ramp/headless/RampsSessionPresenter.test.tsx
```

- [ ] **Step 3: Implement `RampsSessionPresenter`**

```typescript
// RampsSessionPresenter.tsx
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import { selectBuySession } from '../../../../selectors/rampsController';

/**
 * Zero-render component mounted at app root alongside RampsBootstrap.
 * Watches RampsController.buySession and navigates to HeadlessHost
 * when a session becomes active — decoupling session start from any
 * React Navigation context.
 */
function RampsSessionPresenter(): null {
  const buySession = useSelector(selectBuySession);
  const lastSessionId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      buySession.status === 'active' &&
      buySession.sessionId !== lastSessionId.current
    ) {
      lastSessionId.current = buySession.sessionId;
      NavigationService.navigation.navigate(Routes.RAMP.HEADLESS_ENTRY, {
        screen: Routes.RAMP.TOKEN_SELECTION_ROOT,
        params: {
          screen: Routes.RAMP.HEADLESS_HOST,
          params: { headlessSessionId: buySession.sessionId },
        },
      });
    }
    if (buySession.status === 'idle') {
      lastSessionId.current = undefined;
    }
  }, [buySession]);

  return null;
}

export default RampsSessionPresenter;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn jest app/components/UI/Ramp/headless/RampsSessionPresenter.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add app/components/UI/Ramp/headless/RampsSessionPresenter.tsx app/components/UI/Ramp/headless/RampsSessionPresenter.test.tsx
git commit -m "feat(ramps): add RampsSessionPresenter — zero-render controller-driven nav trigger"
```

---

### Task 10: Mount `RampsSessionPresenter` in `RampsBootstrap`

**Files:**
- Modify: `app/components/UI/Ramp/RampsBootstrap.tsx`
- Modify: `app/components/UI/Ramp/RampsBootstrap.test.tsx`

`RampsBootstrap` is already a zero-render component mounted at app root. Add the presenter as its return value so it is always alive.

- [ ] **Step 1: Update `RampsBootstrap`**

```typescript
import React from 'react';
import RampsSessionPresenter from './headless/RampsSessionPresenter';
// ... existing imports unchanged

function RampsBootstrap(): React.ReactElement | null {
  useRampsSmartRouting();
  useRampsProviders({ enableSideEffects: true });
  useRampsPaymentMethods();

  const userRegion = useSelector(selectUserRegion);
  useEffect(() => {
    if (userRegion?.regionCode) {
      Engine.context.RampsController.getTokens(userRegion.regionCode, 'buy');
    }
  }, [userRegion?.regionCode]);

  return <RampsSessionPresenter />;
}
```

- [ ] **Step 2: Update `RampsBootstrap.test.tsx`** — the existing `toJSON()` assertion should still return `null` (presenter returns null), but the description may be misleading. Update any description that says "renders null" to "renders RampsSessionPresenter (which itself renders nothing visible)". Also add a mock for `RampsSessionPresenter`:

```typescript
jest.mock('./headless/RampsSessionPresenter', () => ({
  __esModule: true,
  default: () => null,
}));
```

- [ ] **Step 3: Run tests**

```bash
yarn jest app/components/UI/Ramp/RampsBootstrap.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add app/components/UI/Ramp/RampsBootstrap.tsx app/components/UI/Ramp/RampsBootstrap.test.tsx
git commit -m "feat(ramps): mount RampsSessionPresenter in RampsBootstrap"
```

---

### Task 11: Update `startHeadlessBuy` to call controller instead of navigating

**Files:**
- Modify: `app/components/UI/Ramp/headless/useHeadlessBuy.ts`
- Modify: `app/components/UI/Ramp/headless/useHeadlessBuy.test.ts`

Remove `useNavigation()` from `startHeadlessBuy`. Call `Engine.context.RampsController.startBuySession(session.id)` instead. The `sessionRegistry` callback registration is unchanged.

- [ ] **Step 1: Write a failing test for the new behavior**

In `useHeadlessBuy.test.ts`, add to the existing `startHeadlessBuy` describe block:

```typescript
it('calls RampsController.startBuySession with the session id', () => {
  const { result } = renderHook(() => useHeadlessBuy(), { wrapper });
  act(() => {
    result.current.startHeadlessBuy(mockParams, mockCallbacks);
  });
  expect(mockEngine.context.RampsController.startBuySession).toHaveBeenCalledWith(
    expect.stringMatching(/^headless-buy-/),
  );
});

it('does not call navigation.navigate directly', () => {
  const { result } = renderHook(() => useHeadlessBuy(), { wrapper });
  act(() => {
    result.current.startHeadlessBuy(mockParams, mockCallbacks);
  });
  expect(mockNavigate).not.toHaveBeenCalled();
});
```

Make sure `mockEngine.context.RampsController.startBuySession` is set up as a `jest.fn()` in the test file's Engine mock.

- [ ] **Step 2: Run to verify it fails**

```bash
yarn jest app/components/UI/Ramp/headless/useHeadlessBuy.test.ts -t "startBuySession"
```

- [ ] **Step 3: Update `startHeadlessBuy` in `useHeadlessBuy.ts`**

Remove the `useNavigation` hook and the `navigation.navigate(...)` call. Replace with:

```typescript
Engine.context.RampsController.startBuySession(session.id);
```

Remove `useNavigation` from the hook's deps array and the `useNavigation` import if it's only used here.

- [ ] **Step 4: Run all useHeadlessBuy tests**

```bash
yarn jest app/components/UI/Ramp/headless/useHeadlessBuy.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/components/UI/Ramp/headless/useHeadlessBuy.ts app/components/UI/Ramp/headless/useHeadlessBuy.test.ts
git commit -m "feat(ramps): decouple startHeadlessBuy from useNavigation — use RampsController.startBuySession"
```

---

### Task 12: Update `HeadlessHost` to report session result to controller

**Files:**
- Modify: `app/components/UI/Ramp/Views/HeadlessHost/HeadlessHost.tsx`

`HeadlessHost` already calls `closeSession`/`failSession` on the mobile registry. It should also call the controller so `buySession` transitions to terminal.

Three paths to cover:

**Path A — user navigates back (beforeRemove listener, line ~80):**
```typescript
closeSession(headlessSessionId, { reason: 'user_dismissed' });
Engine.context.RampsController.terminateBuySession(headlessSessionId, 'cancelled');
```

**Path B — auth error (nativeFlowError effect, line ~124):**
```typescript
failSession(headlessSessionId, { code: 'AUTH_FAILED', message: nativeFlowError }, 'AUTH_FAILED');
Engine.context.RampsController.terminateBuySession(headlessSessionId, 'failed', {
  errorCode: 'AUTH_FAILED',
});
```

**Path C — successful completion:** The `continueWithQuote(quote, ctx)` promise at line ~215 currently has only a `.catch`. Convert it to `.then(...).catch(...)` and call `terminateBuySession` in the `.then` arm, **before** the catch:

```typescript
continueWithQuote(quote, ctx)
  .then(() => {
    if (cancelled) return;
    Engine.context.RampsController.terminateBuySession(headlessSessionId, 'completed');
  })
  .catch((error: Error) => {
    // existing error handling unchanged
  });
```

- [ ] **Step 1: Write failing tests for all three paths** in `HeadlessHost.test.tsx` (create if missing), verifying `mockTerminateBuySession` is called with the right args in each case.

- [ ] **Step 2: Run to verify they fail**

```bash
yarn jest app/components/UI/Ramp/Views/HeadlessHost --no-coverage
```

- [ ] **Step 3: Apply the three changes above**

- [ ] **Step 4: Run HeadlessHost tests**

```bash
yarn jest app/components/UI/Ramp/Views/HeadlessHost --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add app/components/UI/Ramp/Views/HeadlessHost/HeadlessHost.tsx
git commit -m "feat(ramps): report session result to RampsController from HeadlessHost"
```

---

### Task 13: Wire `clearBuySession` in the consumer

**Files:**
- Modify: wherever the headless `onClose`/`onError` callbacks are handled in the MM Pay fiat deposit flow (look for the `startHeadlessBuy` call site in the confirmation screen or nearby)

After handling the terminal outcome (showing success toast or routing away), call:

```typescript
Engine.context.RampsController.clearBuySession();
```

This resets `buySession` to idle so it doesn't linger.

- [ ] **Step 1: Find the call site** — search for `startHeadlessBuy` usage in the codebase to locate the consumer:

```bash
grep -rn "startHeadlessBuy" app --include="*.tsx" --include="*.ts" | grep -v test
```

- [ ] **Step 2: Add `clearBuySession()` after the terminal result is processed**

- [ ] **Step 3: Test that `buySession` returns to idle after the callback fires**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(ramps): clear buy session state after consumer processes terminal result"
```

---

### Task 14: Integration smoke test

- [ ] **Step 1: Run the full Ramp test suite**

```bash
yarn jest app/components/UI/Ramp --no-coverage
```

- [ ] **Step 2: Run Money tests**

```bash
yarn jest app/components/UI/Money --no-coverage
```

- [ ] **Step 3: Run selector tests**

```bash
yarn jest app/selectors/rampsController --no-coverage
```

- [ ] **Step 4: Typecheck**

```bash
yarn lint:tsc
```

- [ ] **Step 5: Lint**

```bash
yarn lint
```

- [ ] **Step 6: Push**

```bash
git push -u origin feat/ramps-session-presenter
```

---

## Dependency Graph

```
Task 1 (state type + snapshot fixes)
  └── Task 2 (methods)
        └── Task 3 (event)
              └── Task 4 (exports + codegen)
                    └── Task 5 (changelog)
                          └── Task 6 (preview build)
                                └── Task 7 (mobile messenger)
                                      └── Task 8 (selector)
                                            └── Task 9 (presenter)
                                                  ├── Task 10 (mount)
                                                  ├── Task 11 (startHeadlessBuy)
                                                  ├── Task 12 (HeadlessHost)
                                                  └── Task 13 (consumer)
                                                        └── Task 14 (integration)
```
