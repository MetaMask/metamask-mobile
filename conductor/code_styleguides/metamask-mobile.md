# MetaMask Mobile Style Guide (TS + Tailwind)

This guide outlines the specific conventions for TypeScript and Tailwind CSS usage in the MetaMask Mobile project, based on existing patterns in the codebase.

## 1. Component Structure

- **Functional Components:** Always use functional components with hooks.
- **TypeScript for Props:** Use interfaces or types for component props. Prefer `React.FC<Props>` for defining components.
- **Exports:** Use **default exports** for the main component in a file.
- **Hooks:** Use `useCallback` for event handlers and `useMemo` for expensive computations.

## 2. Styling with Tailwind

- **Hook Usage:** Use the `useTailwind()` hook from `@metamask/design-system-twrnc-preset`.
- **Applying Styles:**
  - Use `tw.style('...')` for the `style` prop.
  - Use the `twClassName` prop when available on Design System components (e.g., `Box`).
- **Design Tokens:** Always prefer MMDS design tokens over hardcoded values.

## 3. TypeScript Best Practices

- **Type Safety:** Avoid `any`. Use specific types or `unknown`.
- **Explicit Types:** Be explicit about prop types and return types for complex functions.
- **Consistent Naming:** Use `PascalCase` for components and types, `camelCase` for variables and functions.

## 4. Redux Integration

- **Hooks:** Use `useSelector` and `useDispatch` for interacting with the Redux store.
- **Slices:** Follow the pattern of using Redux Toolkit slices.

## 5. Directory Layout

- Components should generally be co-located with their styles, types, and tests:
  - `ComponentName.tsx` (Component)
  - `ComponentName.styles.ts` (Styles - if not using inline Tailwind)
  - `ComponentName.types.ts` (Type definitions)
  - `ComponentName.test.tsx` (Tests)
