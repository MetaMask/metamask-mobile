# Performance

Performance optimization in React Native applications is a complex and multifaceted challenge. It encompasses various aspects such as rendering efficiency, memory management, network operations, and native module interactions. Poor performance can manifest in different ways - from sluggish UI responses and excessive battery drain to memory leaks and app crashes.

This guide aims to help you navigate this complex landscape by providing best practices, common pitfalls to avoid, and the right tools to measure and improve performance. We'll focus on key areas that significantly impact app performance, including:

- [Re-renders and component optimization](#re-renders-and-component-optimization)
- [Memory usage and management](#memory-usage-and-management)
- [Network and data fetching strategies](#network-and-data-fetching-strategies)
- [Animation and interaction smoothness](#animation-and-interaction-smoothness)

By understanding these areas and applying the recommended practices, you can create a more efficient and responsive application that provides a better user experience.

## Re-renders and component optimization

Re-renders are a common source of performance issues in React Native applications. While some re-renders are necessary for updating the UI, unnecessary re-renders can significantly impact performance. Here are some areas that we've seen that can cause performance issues:

### Components

Components that aren't memoized can re-render even when their props haven't changed.

Best practices:

- **React.memo**: Use for functional components to prevent unnecessary re-renders

Example of component memoization:

```javascript
// Bad - re-renders on every parent update
const MyComponent = (props) => {
  /* ... */
};

// Good - only re-renders when props change
const MyComponent = React.memo((props) => {
  /* ... */
});
```

### Selectors

Selectors, especially in Redux or other state management solutions, can cause unnecessary re-renders if not properly optimized.

Best practices:

- **Memoize selectors**: Selectors that create new object references on each call can trigger re-renders even when the underlying data hasn't changed. Use memoized selectors such as [createSelector](https://reselect.js.org/api/createSelector) from [reselect](https://github.com/reduxjs/reselect) to prevent unnecessary re-renders.
- **Selector Composition**: Complex selector chains can lead to multiple re-renders. Keep selectors focused and simple.

Example of selector optimization:

```javascript
// Bad - creates new array every time
const getActiveItems = (state) => {
  return state.items.filter((item) => item.isActive);
};

const getAllItems = (state) => {
  return state.items;
};

// Good - memoized selector and only recomputes when state.items changes
const getActiveItems = createSelector(getAllItems, (items) =>
  items.filter((item) => item.isActive),
);
```

### Hooks and Functions

Hooks and functions that aren't properly memoized can cause unnecessary re-renders.

Best practices:

- [**useMemo**](https://react.dev/reference/react/useMemo): Computed values should be memoized to prevent recalculation on every render, especially for computed values that are expensive to compute.
- [**useCallback**](https://react.dev/reference/react/useCallback): Complex functions created inside components should be wrapped in `useCallback` to maintain referential equality.
- [**useEffect**](https://react.dev/reference/react/useEffect): Apply correct dependencies to `useEffect` to prevent unnecessary triggers and re-renders.

Example of memoizing a computed value using `useMemo`:

```javascript
// Bad - new array created every render
const items = data.map((item) => ({
  ...item,
  processed: processItem(item),
}));

// Good - memoized array transformation that changes only when data changes
const items = useMemo(
  () =>
    data.map((item) => ({
      ...item,
      processed: processItem(item),
    })),
  [data],
);
```

Example of memoizing a function using `useCallback`:

```javascript
// Bad - new function created every render
const renderScrollBar = () => {
  return <ScrollableTabView data={data} />;
};

// Good - function memoized with proper dependencies
const renderScrollBar = useCallback(() => {
  return <ScrollableTabView data={data} />;
}, [data]);
```

Example of proper dependencies in `useEffect`:

```javascript
// Bad - missing dependencies and unnecessary effect runs on every re-render
useEffect(() => {
  processUserId(userId);
}); // Missing userId dependency

// Good - proper dependencies
useEffect(() => {
  processUserId(userId);
}, [userId]); // Effect runs only when userId changes
```

## Memory usage and management

WIP

## Network and data fetching

WIP

## Animation and interaction smoothness

WIP
