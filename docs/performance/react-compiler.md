# React Compiler

[React Compiler](https://react.dev/learn/react-compiler) is a build-time tool that automatically memoizes components, callbacks, and computed values per the [Rules of React](https://react.dev/reference/rules) — removing most hand-written `React.memo`/`useMemo`/`useCallback`. It's **already installed and enabled app-wide** in this repo.

## Current setup

- `babel-plugin-react-compiler` + the ESLint plugin are installed.
- ESLint: `react-compiler/react-compiler` runs as a **warning**.
- Babel wiring lives in `scripts/react-compiler.js` and is spread into `babel.config.js` via `reactCompilerBabelConfig`.
- Plugin order in `babel.config.js`: React Compiler runs **first**; `react-native-reanimated/plugin` must remain **last** (required for `'worklet'`).
- The compiler is disabled under Jest (`NODE_ENV === 'test'`) to avoid conflicts with `jest.mock` hoisting.
- Optional bailout logging: set `REACT_COMPILER_LOG_FAILURES=true` to append skip/error events to the git-ignored `react-compiler.log`.

## Clearing bailouts for a feature

The compiler silently skips components that violate the Rules of React. Use the already-installed ESLint plugin to find them:

```bash
yarn eslint <path>   # react-compiler/react-compiler warnings = what the compiler would skip
```

(The standalone `react-compiler-healthcheck` CLI gives a repo-wide count but isn't installed.)

Common fixes:

- Restructure `try`/`finally` and value-blocks-inside-try
- Remove `eslint-disable` comments that force skips (especially `react-hooks/exhaustive-deps`)
- Move ref reads/writes out of render when needed (e.g. sync in `useEffect`)
- Remove/adjust manual memoization the compiler can't preserve
- Replace mount-only `useEffect(..., [])` + exhaustive-deps suppressions with a once-guard ref and real dependencies

After fixing, clear Metro's cache and verify in React DevTools:

```bash
yarn watch:clean
```

Optimized components show a `Memo ✨` badge in React DevTools.

## What it does / doesn't do

- **Does:** auto-memoize good code; reduce cascading re-renders.
- **Doesn't:** fix bad patterns. A broken selector still returns new references — the compiler can't save you. Fix the [anti-patterns](./anti-patterns.md) first.
- **Class components** are not optimized.
- It **skips** (safely) any component with a Rules-of-React violation — fix the ESLint `react-compiler` warnings on a path so it actually optimizes.

## Don't

- Don't reintroduce a `sources` / `pathsToInclude` allowlist unless you intentionally want to roll back to incremental opt-in — the compiler is already applied app-wide.
- Don't change `target` away from the plugin default used by the installed Expo/RN toolchain, or reorder the reanimated plugin off last.
