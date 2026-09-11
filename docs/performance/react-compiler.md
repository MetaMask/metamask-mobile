# React Compiler

[React Compiler](https://react.dev/learn/react-compiler) is a build-time tool that automatically memoizes components, callbacks, and computed values per the [Rules of React](https://react.dev/reference/rules) — removing most hand-written `React.memo`/`useMemo`/`useCallback`. It's **already installed and configured** in this repo and adopted **incrementally**, directory by directory.

## Current setup

- `babel-plugin-react-compiler` + `react-compiler-runtime` + the ESLint plugin are installed.
- ESLint: `react-compiler/react-compiler` runs as a **warning**.
- `babel.config.js`: `target: '18'`, the plugin runs **first**, and `react-native-worklets/plugin` runs **last** (required for `'worklet'`; reanimated 4 moved the babel plugin into react-native-worklets).
- Opted-in paths so far live in the plugin's `sources` `pathsToInclude` list.

```js
// babel.config.js — react-compiler plugin
[
  'react-compiler',
  {
    target: '18',
    sources: (filename) => {
      const pathsToInclude = [
        'app/components/Nav',
        'app/components/UI/DeepLinkModal',
        // add your feature path here to opt in
      ];
      return pathsToInclude.some((path) => filename.includes(path));
    },
  },
],
```

## Opting a feature in

1. **Check Rules-of-React first** — the compiler silently skips components that violate them. Use the already-installed ESLint plugin:
   ```bash
   yarn eslint <path>   # react-compiler/react-compiler warnings = what the compiler would skip
   ```
   (The standalone `react-compiler-healthcheck` CLI gives a repo-wide count but isn't installed.)
2. **Add the path** to `pathsToInclude` in `babel.config.js`.
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

- Don't hardcode the current path list as permanent — read `babel.config.js`.
- Don't change `target` away from `'18'` or reorder the reanimated plugin off last.
