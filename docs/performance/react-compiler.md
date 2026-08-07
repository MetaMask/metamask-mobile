# React Compiler

[React Compiler](https://react.dev/learn/react-compiler) is a build-time tool that automatically memoizes components, callbacks, and computed values per the [Rules of React](https://react.dev/reference/rules) — removing most hand-written `React.memo`/`useMemo`/`useCallback`. It's **already installed, configured, and enabled across the app**.

## Current setup

- `babel-plugin-react-compiler` + `react-compiler-runtime` + the ESLint plugin are installed.
- ESLint: `react-compiler/react-compiler` runs as a **warning**.
- Plugin wiring lives in `scripts/react-compiler.js` and is spread into `babel.config.js` **first**; `react-native-reanimated/plugin` remains **last** (required for `'worklet'`).
- The compiler is **fully enabled** (no per-directory `pathsToInclude` gate). It still silently skips any component that violates the Rules of React — those show up as `react-compiler/react-compiler` ESLint warnings.

Optional bailout logging (Metro builds):

```bash
REACT_COMPILER_LOG_FAILURES=true yarn watch:clean
# writes react-compiler.log (git-ignored)
```

## Clearing bailouts for a feature path

1. **Find skips** — the compiler silently skips components that violate the Rules of React. Use the already-installed ESLint plugin:
   ```bash
   yarn eslint <path>   # react-compiler/react-compiler warnings = what the compiler would skip
   ```
   (The standalone `react-compiler-healthcheck` CLI gives a repo-wide count but isn't installed.)
2. **Fix each warning** — common fixes: remove `eslint-disable` comments that force skips (often `react-hooks/exhaustive-deps`) by listing real deps and using a ref guard for run-once semantics; restructure try/finally and value-blocks-inside-try; move ref reads/writes out of render; remove/adjust manual memoization the compiler can't preserve.
3. **Clear Metro's cache** — it caches compiled output aggressively:
   ```bash
   yarn watch:clean
   ```
4. **Verify** — optimized components show a `Memo ✨` badge in React DevTools.

## What it does / doesn't do

- **Does:** auto-memoize good code; reduce cascading re-renders.
- **Doesn't:** fix bad patterns. A broken selector still returns new references — the compiler can't save you. Fix the [anti-patterns](./anti-patterns.md) first.
- **Class components** are not optimized.
- It **skips** (safely) any component with a Rules-of-React violation — fix the ESLint `react-compiler` warnings on a path so it actually optimizes.

## Don't

- Don't reintroduce a `pathsToInclude` allowlist unless there is a deliberate rollback — the compiler is app-wide.
- Don't change `target` away from `'18'` or reorder the reanimated plugin off last.
