# React Navigation v7 - Navigate Behavior Changes

## Overview

React Navigation v7 introduces two significant breaking changes to the `navigate()` function:

1. **Navigate no longer "goes back"** - it always pushes new screens
2. **Stricter TypeScript typing** - navigate requires explicit types

---

## 1. Navigate Push vs Pop Behavior

### The Problem

In **v5/v6**, `navigate()` would automatically go back to an existing screen if it was already in the stack:

```typescript
// v5/v6 - If "WalletView" already exists in stack, this goes BACK to it
navigation.navigate('WalletView');
```

In **v7**, `navigate()` ALWAYS pushes a new screen, even if it already exists:

```typescript
// v7 - This pushes a NEW "WalletView" on top of the existing one!
navigation.navigate('WalletView');
// Result: User is stuck with duplicate screens
```

### The Solution

Use the `pop: true` option to restore the old behavior:

```typescript
// v7 - This correctly goes back to the existing "WalletView"
navigation.navigate({
  name: 'WalletView',
  params: {
    /* optional */
  },
  pop: true,
});
```

### When This Matters

Any code that uses `navigate()` to "go back" after completing an action:

- ❌ After transaction confirmation → navigate to wallet
- ❌ After closing a modal → navigate to previous screen
- ❌ Cancel/back buttons that navigate to a specific screen
- ❌ Error handlers that return user to a safe screen

### Affected Patterns in Codebase

```typescript
// BROKEN in v7 - will push duplicate screens:
navigation.navigate(Routes.WALLET_VIEW);
navigation.navigate(Routes.WALLET.HOME, { screen: Routes.WALLET_VIEW });
navigation.navigate(Routes.TRANSACTIONS_VIEW);

// FIXED for v7:
navigation.navigate({ name: Routes.WALLET_VIEW, pop: true } as never);
```

---

## 2. Stricter TypeScript Typing

### The Problem

In **v6**, `navigate()` accepted any string as a route name:

```typescript
// v6 - TypeScript allows this
navigation.navigate('AnyScreenName', { param: value });
```

In **v7**, without proper typing, TypeScript will error:

```typescript
// v7 - TypeScript error: Argument of type 'string' is not assignable...
navigation.navigate('AnyScreenName', { param: value });
```

### Solutions

#### Option 1: Type Assertion (Quick Fix)

```typescript
navigation.navigate({
  name: 'ScreenName',
  params: {
    /* ... */
  },
  pop: true,
} as never);
```

#### Option 2: Properly Typed Navigation (Recommended)

```typescript
// Define your param list
type RootStackParamList = {
  WalletView: undefined;
  Asset: { address: string };
  Send: { token: string };
};

// Use with typed navigation
const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
navigation.navigate('WalletView'); // Now properly typed
```

---

## 3. Properly Typed Navigation - Implementation

### Goal

Create a centralized, type-safe navigation system that:

1. Provides autocomplete for all route names
2. Enforces correct params for each route
3. Catches navigation errors at compile time
4. Adds `pop: true` by default

### Step 1: Central ParamList Types ✅ DONE

**File:** `app/types/navigation.d.ts`  
**Reference:** `docs/navigation-types-reference.ts`

This file contains the complete `RootParamList` with all routes and their params. Key features:

#### Uses `type` instead of `interface`

As required by React Navigation docs:

```typescript
// CORRECT - React Navigation requires type, not interface
export type RootParamList = {
  WalletView: { shouldSelectPerpsTab?: boolean } | undefined;
  Asset: TokenI & { chainId?: string; isFromSearch?: boolean };
  // ...
};
```

#### Imports Param Types from Components

Keeps types close to their source:

```typescript
import { AssetDetailsParams } from '../../components/Views/AssetDetails/AssetDetails.types';
import { SecuritySettingsParams } from '../../components/Views/Settings/SecuritySettings/SecuritySettings.types';
// ...

export type RootParamList = {
  AssetDetails: AssetDetailsParams;
  SecuritySettings: SecuritySettingsParams | undefined;
  // ...
};
```

#### Handles Nested Navigation

```typescript
export type NavigatableRootParamList = {
  [K in keyof RootParamList]:
    | RootParamList[K] // Direct navigation
    | NavigatorScreenParams<RootParamList>; // Nested navigation
};
```

#### Global Type Declaration (The Key Part!)

This makes `useNavigation()` automatically typed without passing generics:

```typescript
declare global {
  namespace ReactNavigation {
    interface RootParamList extends NavigatableRootParamList {}
  }

  // Global type for NavigationContainerRef
  type TypedNavigationContainerRef =
    import('@react-navigation/native').NavigationContainerRef<NavigatableRootParamList>;
}
```

#### Result

```typescript
// Before: needed type assertion
navigation.navigate({
  name: 'Asset',
  params: { address: '0x...' },
  pop: true,
} as never);

// After: fully typed, autocomplete works!
navigation.navigate('Asset', { address: '0x...' });
// TypeScript knows 'address' is required, 'chainId' is optional, etc.
```

### Step 2: Create Typed Navigation Hooks

Update `app/util/navigation/navUtils.ts`:

```typescript
// app/util/navigation/navUtils.ts

import { useCallback, useMemo } from 'react';
import {
  NavigationProp,
  useNavigation as useNavigationNative,
  useRoute,
  RouteProp,
  ParamListBase,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../types/navigation/RootParamList';

// ============================================
// Type-safe useNavigation with pop: true default
// ============================================

type NavigateParams<
  T extends ParamListBase,
  K extends keyof T,
> = T[K] extends undefined
  ? { name: K; params?: undefined; pop?: boolean }
  : { name: K; params: T[K]; pop?: boolean };

export function useNavigation<T extends ParamListBase = RootStackParamList>() {
  const navigation = useNavigationNative<NavigationProp<T>>();

  const navigate = useCallback(
    <K extends keyof T & string>(
      nameOrOptions: K | NavigateParams<T, K>,
      params?: T[K],
    ) => {
      if (typeof nameOrOptions === 'string') {
        // String form: navigate('ScreenName', params)
        return navigation.navigate({
          name: nameOrOptions,
          params,
          pop: true,
        } as never);
      }
      // Object form: navigate({ name, params, pop })
      return navigation.navigate({
        ...nameOrOptions,
        pop: nameOrOptions.pop ?? true,
      } as never);
    },
    [navigation],
  );

  // Return navigation with wrapped navigate
  return useMemo(
    () => ({
      ...navigation,
      navigate,
      // Keep original for cases where you explicitly want to push
      push: navigation.navigate.bind(navigation),
    }),
    [navigation, navigate],
  );
}

// ============================================
// Type-safe useRoute
// ============================================

export function useParams<
  T extends keyof RootStackParamList,
>(): RootStackParamList[T] {
  const route = useRoute<RouteProp<RootStackParamList, T>>();
  return route.params as RootStackParamList[T];
}

// ============================================
// Convenience type exports
// ============================================

export type { RootStackParamList } from '../../types/navigation/RootParamList';
```

### Step 3: Create Screen-Specific Navigation Hooks

For complex flows, create dedicated hooks:

```typescript
// app/components/UI/Send/hooks/useSendNavigation.ts

import { useNavigation } from '../../../../util/navigation/navUtils';
import type { SendParamList } from '../../../../types/navigation/RootParamList';
import Routes from '../../../../constants/navigation/Routes';

export function useSendNavigation() {
  const navigation = useNavigation<SendParamList>();

  return {
    goToAmount: () => navigation.navigate(Routes.SEND.AMOUNT),
    goToAsset: (preSelectedAsset?: string) =>
      navigation.navigate(Routes.SEND.ASSET, { preSelectedAsset }),
    goToRecipient: (amount: string) =>
      navigation.navigate(Routes.SEND.RECIPIENT, { amount }),
    goToConfirm: (amount: string, recipient: string) =>
      navigation.navigate(Routes.SEND.CONFIRM, { amount, recipient }),
    goBack: () => navigation.goBack(),
  };
}
```

### Step 4: Update NavigationService

```typescript
// app/core/NavigationService/NavigationService.ts

import {
  createNavigationContainerRef,
  StackActions,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../types/navigation/RootParamList';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const NavigationService = {
  navigate<K extends keyof RootStackParamList>(
    name: K,
    params?: RootStackParamList[K],
    options?: { pop?: boolean },
  ) {
    if (navigationRef.isReady()) {
      navigationRef.navigate({
        name,
        params,
        pop: options?.pop ?? true, // Default to pop: true
      } as never);
    }
  },

  // Explicit push (no pop behavior)
  push<K extends keyof RootStackParamList>(
    name: K,
    params?: RootStackParamList[K],
  ) {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.push(name as string, params));
    }
  },

  goBack() {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    }
  },

  popToTop() {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.popToTop());
    }
  },
};

export default NavigationService;
```

### Step 5: Migration Strategy

#### Phase 1: Setup ✅ DONE

- [x] Create `app/types/navigation.d.ts` with `RootParamList`
- [x] Add global type declaration for automatic typing
- [x] Define all routes with their params

#### Phase 2: Add `pop: true` Default ✅ DONE

- [x] Enhanced `useNavigation` in `navUtils.ts` to wrap `navigate()` with `pop: true`
- [x] Enhanced `NavigationService` to use `pop: true` by default
- [ ] Test core flows (Send, Asset, Settings)

#### Phase 3: Migrate Imports (Optional)

- [ ] Migrate files from `@react-navigation/native` to `navUtils`
- [ ] Add ESLint rule to enforce custom navigation hook
- [ ] Remove remaining `as never` type assertions

#### Phase 4: Cleanup

- [ ] Remove any remaining manual `pop: true` additions
- [ ] Update documentation

### Step 6: ESLint Rule (Optional)

Add to `.eslintrc.js` to enforce using custom navigation:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@react-navigation/native',
            importNames: ['useNavigation'],
            message:
              'Use useNavigation from app/util/navigation/navUtils instead.',
          },
        ],
      },
    ],
  },
};
```

### Benefits After Migration

1. **Autocomplete**: IDE shows all available routes
2. **Type Safety**: Wrong params = compile error
3. **Refactoring**: Rename a route → TypeScript shows all usages
4. **Documentation**: Types serve as documentation for route params
5. **No more `as never`**: Proper types eliminate the need for assertions
6. **Consistent pop behavior**: All navigations go back by default

### Example Usage After Migration

```typescript
// Before (v6 style, broken in v7)
navigation.navigate('Asset', { address: '0x123' });

// After (properly typed with pop: true default)
import { useNavigation } from '../../util/navigation/navUtils';

const MyComponent = () => {
  const navigation = useNavigation();

  // ✅ Autocomplete for route names
  // ✅ Type checking for params
  // ✅ Automatically uses pop: true
  navigation.navigate('Asset', { address: '0x123' });

  // Or explicitly push a new screen
  navigation.push('Asset', { address: '0x123' });
};
```

---

## Current Status

### ✅ Completed

- **Type Safety**: `app/types/navigation.d.ts` provides full typing for all routes
- **Global Declaration**: `useNavigation()` is automatically typed via `ReactNavigation.RootParamList`
- **`pop: true` Default**: `navUtils.ts` and `NavigationService` now add `pop: true` by default

### 🔲 Remaining Work

- **Migration**: Optionally migrate files from `@react-navigation/native` to custom hooks (for `pop: true` benefit)
- **Testing**: Verify all navigation flows work correctly

### Implementation Details

**`app/util/navigation/navUtils.ts`:**

```typescript
// useNavigation hook now wraps navigate() with pop: true by default
export const useNavigation = <
  T extends ParamListBase = ParamListBase,
>(): NavigationProp<T> => {
  const navigation = useNavigationNative<NavigationProp<T>>();

  const wrappedNavigate = useCallback(
    (nameOrOptions, params) => {
      if (typeof nameOrOptions === 'string') {
        return navigation.navigate({ name: nameOrOptions, params, pop: true });
      }
      return navigation.navigate({
        ...nameOrOptions,
        pop: nameOrOptions.pop ?? true,
      });
    },
    [navigation],
  );

  return { ...navigation, navigate: wrappedNavigate };
};
```

**`app/core/NavigationService/NavigationService.ts`:**

```typescript
// NavigationService.navigation.navigate() now uses pop: true by default
class WrappedNavigation {
  navigate(nameOrOptions, params) {
    if (typeof nameOrOptions === 'string') {
      return this.#navRef.navigate({ name: nameOrOptions, params, pop: true });
    }
    return this.#navRef.navigate({
      ...nameOrOptions,
      pop: nameOrOptions.pop ?? true,
    });
  }
  // Plus: goBack(), canGoBack(), popToTop(), pop(n), dispatch(), etc.
}
```

### Files Count

~657 files currently import directly from `@react-navigation/native`:

```bash
# Find all files that would need migration
grep -r "from '@react-navigation/native'" app/ --include="*.ts" --include="*.tsx" -l | wc -l
```

**Note:** Files using `useNavigation` from `@react-navigation/native` will NOT get the `pop: true` behavior automatically. To benefit from it, they should import from `app/util/navigation/navUtils` instead.

---

## `createNavigationDetails` - DEPRECATED

The `createNavigationDetails` helper function is now **deprecated**. Use direct navigation for full type safety.

### Why Deprecated?

| Aspect                 | `createNavigationDetails`            | Direct `navigate()`                        |
| ---------------------- | ------------------------------------ | ------------------------------------------ |
| Route name validated   | ❌ No (uses `string`)                | ✅ Yes (literal type from `RootParamList`) |
| Params validated       | ⚠️ Partial (caller-defined `T` only) | ✅ Yes (from `RootParamList[RouteName]`)   |
| Type assertions        | ⚠️ Returns `[any, any]`              | ✅ None needed                             |
| React Nav v7 idiomatic | ❌ No                                | ✅ Yes                                     |

### Migration

```typescript
// ❌ DEPRECATED
const goToScreen = createNavigationDetails<MyParams>(Routes.SCREEN);
navigation.navigate(...goToScreen({ id: '123' }));

// ✅ RECOMMENDED - Full type safety with RootParamList
navigation.navigate(Routes.SCREEN, { id: '123' });

// ✅ For nested navigator navigation
navigation.navigate(Routes.MODAL.ROOT, {
  screen: Routes.MODAL.SCREEN,
  params: { id: '123' },
});
```

### Technical Details

`createNavigationDetails` now returns `[any, any]` to satisfy React Navigation v7's strict `navigate()` overloads. This was necessary because:

1. v7's `navigate()` expects tuples with **literal route names** (e.g., `["WalletView", params]`)
2. The helper's return type was `[keyof RootParamList, T]` - a union type that doesn't match any specific literal
3. Using `[any, any]` bypasses this check but loses type safety

Direct navigation with `RootParamList` global type augmentation provides complete type checking.

---

## Quick Reference

| Scenario                   | v5/v6                           | v7                                                       | Status       |
| -------------------------- | ------------------------------- | -------------------------------------------------------- | ------------ |
| Navigate to new screen     | `navigate('Screen')`            | `navigate('Screen')`                                     | ✅ Works     |
| Go back to existing screen | `navigate('Screen')`            | Use `navUtils` or `NavigationService` (auto `pop: true`) | ✅ Done      |
| Navigate with params       | `navigate('Screen', { id: 1 })` | `navigate('Screen', { id: 1 })`                          | ✅ Typed     |
| Type safety                | Loose                           | Strict via `RootParamList`                               | ✅ Done      |
| Force push (no pop)        | N/A                             | `navigate({ name: 'Screen', pop: false })`               | ✅ Available |

---

## Related Files

- **`app/types/navigation.d.ts`** - Central `RootParamList` with all routes and params ✅
- **`docs/navigation-types-reference.ts`** - Reference copy for documentation
- `app/util/navigation/navUtils.ts` - Custom navigation hooks (needs `pop: true` enhancement)
- `app/core/NavigationService/NavigationService.ts` - Global navigation service (needs `pop: true` enhancement)

---

## See Also

- [React Navigation v7 Migration Guide](https://reactnavigation.org/docs/7.x/upgrading-from-6.x)
- `react-navigation-v7-plan.md` - Overall migration tracking
