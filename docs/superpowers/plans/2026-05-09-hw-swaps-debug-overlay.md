# HW Swaps Debug Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a debug overlay to the HardwareWalletsSwaps screen that lets developers force the component into any state via buttons, toggled from Developer Options.

**Architecture:** A React context (`HwSwapsDebugContext`) provides session-only toggle state. A new `forceHwSwapsState` Redux action bypasses the state machine to set arbitrary state. An overlay component renders a row of status buttons at the top of the HW swaps screen.

**Tech Stack:** React Native, Redux Toolkit, TypeScript, existing design-system components

---

### Task 1: Add `forceHwSwapsState` Redux Action

**Files:**

- Modify: `app/core/redux/slices/bridge/index.ts:264-268` (add reducer) and `:779` (add export)

- [ ] **Step 1: Write the failing test**

Create `app/core/redux/slices/bridge/forceHwSwapsState.test.ts`:

```ts
import { forceHwSwapsState, resetHardwareWalletsSwaps } from './index';
import { HardwareWalletsSwapsStatus } from '../../../components/UI/Bridge/Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';
import { store } from '../../../store';

describe('forceHwSwapsState', () => {
  afterEach(() => {
    store.dispatch(resetHardwareWalletsSwaps());
  });

  it('directly sets hardwareWalletsSwaps state', () => {
    const snapshot = {
      status: HardwareWalletsSwapsStatus.Rejected,
      currentStep: 2,
      totalSteps: 2,
      steps: [
        { kind: 'approval' as const, status: 'signed' as const },
        { kind: 'transaction' as const, status: 'rejected' as const },
      ],
      disconnectedStep: null,
    };

    store.dispatch(forceHwSwapsState(snapshot));

    const state = store.getState();
    expect(state.bridge.hardwareWalletsSwaps).toEqual(snapshot);
  });

  it('overwrites any previous state', () => {
    store.dispatch(
      forceHwSwapsState({
        status: HardwareWalletsSwapsStatus.Submitted,
        currentStep: 2,
        totalSteps: 2,
        steps: [
          { kind: 'approval', status: 'signed' },
          { kind: 'transaction', status: 'signed' },
        ],
        disconnectedStep: null,
      }),
    );

    store.dispatch(
      forceHwSwapsState({
        status: HardwareWalletsSwapsStatus.Idle,
        currentStep: 0,
        totalSteps: 0,
        steps: [],
        disconnectedStep: null,
      }),
    );

    const state = store.getState();
    expect(state.bridge.hardwareWalletsSwaps.status).toBe(
      HardwareWalletsSwapsStatus.Idle,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest app/core/redux/slices/bridge/forceHwSwapsState.test.ts --no-coverage`
Expected: FAIL — `forceHwSwapsState` is not exported

- [ ] **Step 3: Add the reducer and export**

In `app/core/redux/slices/bridge/index.ts`, add after the `resetHardwareWalletsSwaps` reducer (line 266):

```ts
    forceHwSwapsState: (
      state,
      action: PayloadAction<HardwareWalletsSwapsState>,
    ) => {
      state.hardwareWalletsSwaps = action.payload;
    },
```

Add `forceHwSwapsState` to the destructured export at line 779:

```ts
  resetHardwareWalletsSwaps,
  forceHwSwapsState,
} = actions;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn jest app/core/redux/slices/bridge/forceHwSwapsState.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/core/redux/slices/bridge/index.ts app/core/redux/slices/bridge/forceHwSwapsState.test.ts
git commit -m "feat(bridge): add forceHwSwapsState debug Redux action"
```

---

### Task 2: Create HwSwapsDebugContext

**Files:**

- Create: `app/components/UI/Bridge/Views/HardwareWalletsSwaps/debug/HwSwapsDebugContext.tsx`

- [ ] **Step 1: Create the context file**

```tsx
import React, { createContext, useContext, useState } from 'react';

interface HwSwapsDebugContextValue {
  isDebugOverlayEnabled: boolean;
  setDebugOverlayEnabled: (enabled: boolean) => void;
}

const HwSwapsDebugContext = createContext<HwSwapsDebugContextValue>({
  isDebugOverlayEnabled: false,
  setDebugOverlayEnabled: () => {},
});

export function HwSwapsDebugProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDebugOverlayEnabled, setDebugOverlayEnabled] = useState(false);

  return (
    <HwSwapsDebugContext.Provider
      value={{ isDebugOverlayEnabled, setDebugOverlayEnabled }}
    >
      {children}
    </HwSwapsDebugContext.Provider>
  );
}

export function useHwSwapsDebug() {
  return useContext(HwSwapsDebugContext);
}
```

- [ ] **Step 2: Wrap app root with the provider**

In `app/components/Views/Root/index.tsx`, add the import:

```ts
import { HwSwapsDebugProvider } from '../../UI/Bridge/Views/HardwareWalletsSwaps/debug/HwSwapsDebugContext';
```

Wrap `<App />` with the provider (inside `HardwareWalletProvider`, around `<ReducedMotionConfig>` and `<App />`):

```tsx
<HardwareWalletProvider>
  <HwSwapsDebugProvider>
    <ReducedMotionConfig mode={ReduceMotion.Never} />
    <App />
  </HwSwapsDebugProvider>
</HardwareWalletProvider>
```

- [ ] **Step 3: Verify TypeScript**

Run: `yarn lint:tsc 2>&1 | grep -v "node_modules" | grep "error TS" | grep -v "bridgeReducerState\|useBridgeConfirm.test"`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add app/components/UI/Bridge/Views/HardwareWalletsSwaps/debug/HwSwapsDebugContext.tsx app/components/Views/Root/index.tsx
git commit -m "feat(bridge): add HwSwapsDebugContext for debug overlay toggle"
```

---

### Task 3: Create State Snapshots

**Files:**

- Create: `app/components/UI/Bridge/Views/HardwareWalletsSwaps/debug/HwSwapsDebugSnapshots.ts`

- [ ] **Step 1: Create the snapshots file**

```ts
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  type HardwareWalletsSwapsState,
} from '../HardwareWalletsSwaps.state';

export interface HwSwapsDebugSnapshot {
  label: string;
  state: HardwareWalletsSwapsState;
}

export const HW_SWAPS_DEBUG_SNAPSHOTS: HwSwapsDebugSnapshot[] = [
  {
    label: 'Idle',
    state: {
      status: HardwareWalletsSwapsStatus.Idle,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
      disconnectedStep: null,
    },
  },
  {
    label: 'Waiting',
    state: {
      status: HardwareWalletsSwapsStatus.Waiting,
      currentStep: 1,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'waiting' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'waiting' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Signing',
    state: {
      status: HardwareWalletsSwapsStatus.Waiting,
      currentStep: 1,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signing' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'waiting' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Submitted',
    state: {
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signed' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'signed' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Rejected',
    state: {
      status: HardwareWalletsSwapsStatus.Rejected,
      currentStep: 2,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signed' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'rejected' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Failed',
    state: {
      status: HardwareWalletsSwapsStatus.Failed,
      currentStep: 2,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signed' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'waiting' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Disconnected',
    state: {
      status: HardwareWalletsSwapsStatus.Disconnected,
      currentStep: 1,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signing' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'waiting' },
      ],
      disconnectedStep: 1,
    },
  },
  {
    label: 'Cancelled',
    state: {
      status: HardwareWalletsSwapsStatus.Cancelled,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
      disconnectedStep: null,
    },
  },
];
```

- [ ] **Step 2: Verify TypeScript**

Run: `yarn lint:tsc 2>&1 | grep -v "node_modules" | grep "error TS" | grep -v "bridgeReducerState\|useBridgeConfirm.test"`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add app/components/UI/Bridge/Views/HardwareWalletsSwaps/debug/HwSwapsDebugSnapshots.ts
git commit -m "feat(bridge): add HW swaps debug state snapshots"
```

---

### Task 4: Create HwSwapsDebugOverlay Component

**Files:**

- Create: `app/components/UI/Bridge/Views/HardwareWalletsSwaps/debug/HwSwapsDebugOverlay.tsx`

- [ ] **Step 1: Create the overlay component**

```tsx
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Button,
  ButtonVariant,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import { forceHwSwapsState } from '../../../../../../core/redux/slices/bridge';
import { useHwSwapsDebug } from './HwSwapsDebugContext';
import { HW_SWAPS_DEBUG_SNAPSHOTS } from './HwSwapsDebugSnapshots';

export function HwSwapsDebugOverlay() {
  const dispatch = useDispatch();
  const { isDebugOverlayEnabled } = useHwSwapsDebug();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isDebugOverlayEnabled) return null;

  if (isCollapsed) {
    return (
      <Box position="absolute" top={2} right={2} zIndex={100}>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          onPress={() => setIsCollapsed(false)}
        >
          DBG
        </Button>
      </Box>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      flexWrap="wrap"
      gap={1}
      padding={2}
      style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
    >
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonBaseSize.Sm}
        onPress={() => setIsCollapsed(true)}
      >
        ✕
      </Button>
      {HW_SWAPS_DEBUG_SNAPSHOTS.map((snapshot) => (
        <Button
          key={snapshot.label}
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          onPress={() => dispatch(forceHwSwapsState(snapshot.state))}
        >
          {snapshot.label}
        </Button>
      ))}
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `yarn lint:tsc 2>&1 | grep "HwSwapsDebugOverlay" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/UI/Bridge/Views/HardwareWalletsSwaps/debug/HwSwapsDebugOverlay.tsx
git commit -m "feat(bridge): add HwSwapsDebugOverlay component"
```

---

### Task 5: Render Overlay in HardwareWalletsSwaps

**Files:**

- Modify: `app/components/UI/Bridge/Views/HardwareWalletsSwaps/HardwareWalletsSwaps.tsx`

- [ ] **Step 1: Add import and render the overlay**

Add import at the top of the file (after existing imports):

```ts
import { HwSwapsDebugOverlay } from './debug/HwSwapsDebugOverlay';
```

Add the overlay inside the `<SafeAreaView>`, just before the existing `<Box flexDirection={BoxFlexDirection.Row} justifyContent={BoxJustifyContent.Between}` (the header with the close button). Insert it as the first child:

```tsx
<HwSwapsDebugOverlay />
```

The structure becomes:

```tsx
    <SafeAreaView ...>
      <HwSwapsDebugOverlay />
      <Box flexDirection={BoxFlexDirection.Row} ...>
```

- [ ] **Step 2: Run existing tests**

Run: `yarn jest app/components/UI/Bridge/Views/HardwareWalletsSwaps/HardwareWalletsSwaps.test.tsx --no-coverage`
Expected: Same results as before (10 passed, 8 pre-existing failures). The overlay renders `null` by default since `isDebugOverlayEnabled` is `false`.

- [ ] **Step 3: Commit**

```bash
git add app/components/UI/Bridge/Views/HardwareWalletsSwaps/HardwareWalletsSwaps.tsx
git commit -m "feat(bridge): render debug overlay in HardwareWalletsSwaps screen"
```

---

### Task 6: Create Developer Options Section

**Files:**

- Create: `app/components/Views/Settings/DeveloperOptions/HwSwapsDeveloperOptionsSection.tsx`
- Modify: `app/components/Views/Settings/DeveloperOptions/index.tsx`

- [ ] **Step 1: Create the settings section**

```tsx
import React from 'react';
import { Switch, View, StyleSheet } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { useHwSwapsDebug } from '../../../UI/Bridge/Views/HardwareWalletsSwaps/debug/HwSwapsDebugContext';

const hwSwapsDevSectionStyles = () =>
  StyleSheet.create({
    container: {
      marginTop: 8,
      gap: 8,
    },
    heading: {
      marginTop: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
  });

export const HwSwapsDeveloperOptionsSection = () => {
  const { styles } = useStyles(hwSwapsDevSectionStyles, {});
  const { isDebugOverlayEnabled, setDebugOverlayEnabled } = useHwSwapsDebug();

  return (
    <View style={styles.container}>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        HW Swaps Debug
      </Text>
      <View style={styles.row}>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          Show state overlay on HW Swaps screen
        </Text>
        <Switch
          value={isDebugOverlayEnabled}
          onValueChange={setDebugOverlayEnabled}
        />
      </View>
    </View>
  );
};
```

- [ ] **Step 2: Add to DeveloperOptions screen**

In `app/components/Views/Settings/DeveloperOptions/index.tsx`:

Add import:

```ts
import { HwSwapsDeveloperOptionsSection } from './HwSwapsDeveloperOptionsSection';
```

Add to the ScrollView (after `<HapticsDeveloperOptionsSection />`):

```tsx
<HwSwapsDeveloperOptionsSection />
```

- [ ] **Step 3: Verify TypeScript**

Run: `yarn lint:tsc 2>&1 | grep -v "node_modules" | grep "error TS" | grep -v "bridgeReducerState\|useBridgeConfirm.test"`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add app/components/Views/Settings/DeveloperOptions/HwSwapsDeveloperOptionsSection.tsx app/components/Views/Settings/DeveloperOptions/index.tsx
git commit -m "feat(bridge): add HW swaps debug toggle to Developer Options"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run full TypeScript check**

Run: `yarn lint:tsc 2>&1 | grep -v "node_modules" | grep "error TS" | grep -v "bridgeReducerState\|useBridgeConfirm.test"`
Expected: No new errors

- [ ] **Step 2: Run all new/modified tests**

Run: `yarn jest app/core/redux/slices/bridge/forceHwSwapsState.test.ts app/components/UI/Bridge/Views/HardwareWalletsSwaps/ --no-coverage`
Expected: All pass (excluding pre-existing failures in HardwareWalletsSwaps.test.tsx)

- [ ] **Step 3: Run ESLint**

Run: `yarn lint 2>&1 | tail -5`
Expected: No new errors related to our files
