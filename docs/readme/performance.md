# Performance

Performance optimization in React Native applications is a complex and multifaceted challenge. It encompasses various aspects such as rendering efficiency, memory management, network operations, and native module interactions. Poor performance can manifest in different ways - from sluggish UI responses and excessive battery drain to memory leaks and app crashes.

This guide aims to help you navigate this complex landscape by providing best practices, common pitfalls to avoid, and the right tools to measure and improve performance. Some topics that we'll cover include:

- [Re-renders and component optimization](#re-renders-and-component-optimization)
- [Tool(s) for identifying re-renders](#tools-for-identifying-re-renders)
- [Automatically optimizing React](#automatically-optimizing-react)
- [Worklets (Background JS Threads)](#worklets-background-js-threads)

By understanding these areas and applying the recommended practices, you can create a more efficient and responsive application that provides a better user experience.

## Re-renders and component optimization

> **Note on Over-Optimization**: While memoization is powerful, it's important to use it in moderation. Not every function or computed value needs to be memoized.
>
> Consider memoization when:
>
> - The computation is expensive (e.g., complex calculations, large array transformations)
> - The value is used in dependency arrays of other hooks
>
> No need to optimize when:
>
> - The calculation is cheap
> - You're just returning a primitive or constant
> - It's not causing unnecessary re-renders or performance issues
>
> Avoid premature optimization. Start without memoization and add it only when you observe performance issues.

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
const onPress = () => {
  /* ... */
};

// Assume Button is memoized - still re-renders on parent update because onPress is a new function reference on each render
return <Button onPress={onPress} />;

// Good - function memoized with proper dependencies
const onPress = useCallback(() => {
  /* ... */
}, []);

// Assume Button is memoized - does not re-render on parent update because onPress is a memoized function reference
return <Button onPress={onPress} />;
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

## Tools for identifying re-renders

> **Note on tool availability**: Since `React Native DevTools` is dependent on `Hermes` engine, it is not yet available for iOS since we're still using `JSC` engine. However, we are working on getting `Hermes` enabled on iOS. In the meantime, you can use `React DevTools` to achieve the same render profiling on iOS.

We recommend using [React Native DevTools](https://reactnative.dev/docs/react-native-devtools) on Android and [React DevTools](https://reactnative.dev/docs/0.76/react-native-devtools#react-profiler) on iOS to identify re-renders in your React Native app.

To open `React DevTools` on either platforms, press `shift+m` in the watcher window and select `React DevTools`.

![React DevTools Selection](../assets/performance-render/react-devtools-selection.jpg)

`React DevTools`'s profiling view is set up the same way as `React Native DevTools`'s profiling view.

![React DevTools Selection](../assets/performance-render/react-devtools-profiling.jpg)

To illustrate how the tool can be used, we'll be referencing [Callstack](https://www.callstack.com/)'s recently released 2025 [guide](https://www.callstack.com/ebooks/the-ultimate-guide-to-react-native-optimization) to React Native performance optimization. In this guide, Callstack walks through how to use `React Native DevTools Profiler` to identify re-renders in your React Native app. This tutorial's instructions also applies to `React DevTools`'s profiling feature.

![Callstack Profile Re-render P.14](../assets/performance-render/callstack-p14.jpg)
![Callstack Profile Re-render P.15](../assets/performance-render/callstack-p15.jpg)
![Callstack Profile Re-render P.16](../assets/performance-render/callstack-p16.jpg)
![Callstack Profile Re-render P.17](../assets/performance-render/callstack-p17.jpg)
![Callstack Profile Re-render P.18](../assets/performance-render/callstack-p18.jpg)

## Automatically optimizing React

In 2024, the React team announced a build time tool called [React Compiler](https://react.dev/learn/react-compiler) that we can leverage to automatically optimize React code. Under the hood, the compiler references the [Rules of React](https://react.dev/reference/rules) to memoize code whenever possible. More specifically, the tool uses React APIs such as `useMemo`, `useCallback`, and `React.memo` for memoization. React Compiler has already been integrated into MetaMask's build process, so you can start using it today. We've also added an ESLint plugin for React Compiler that will catch issues during linting based on the rules of React.

### Optimizing new code

Since the plan is to incrementally adopt React Compiler, only code files and paths that are specified by the team will be automatically optimized. To ensure that new code is automatically optimized by React Compiler, add the file path or directory to the `pathsToInclude` in `babel.config.js`. Once added, the new code will be automatically optimized during build time.

```javascript
// babel.config.js

module.exports = {
  /* ... */
  plugins: [
    [
      'react-compiler',
      {
        /* .. */
        sources: (filename) => {
          // Match file paths or directories to include in the React Compiler.
          const pathsToInclude = [
            // Example file path
            'app/components/ExampleDir/index',
            // Example directory
            'app/components/ExampleDir2',
          ];
          return pathsToInclude.some((path) => filename.includes(path));
        },
      },
    ],
  ];
};
```

### Troubleshooting React Compiler

By default, Metro may cache parts of the compiled code especially when using the `yarn watch` command. To perform a clean build, run `yarn watch:clean` instead. You can also verify that the file is picked up by React Compiler by adding a log in the `sources` function to confirm the match.

## Worklets (background JS threads)

[Worklets](https://github.com/margelo/react-native-worklets-core) are small JavaScript functions that can be executed on a separate JavaScript Thread so that they don't clog the main JS Thread. Perfect for heavy computations and processing. Find out how to use them below.

> **Note on Usage**: Worklets are meant to unclog the main JS thread, not to speed up the computational process itself. By unlcoging the main JS thread, the intent is to improve responsiveness (reduce FPS drops).

## runAsync

Purpose: `runAsync` is used to execute code on a different thread without blocking the main JS thread.

When to use: Use it to offload functions to a background thread.

Example:

```
import { Worklets } from 'react-native-worklets-core';
...
const fibonacci = (num: number): number => {
  'worklet'
  if (num <= 1) return num;
  let prev = 0, curr = 1;
  for (let i = 2; i <= num; i++) {
    let next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
}

const context = Worklets.defaultContext
const result = await context.runAsync(() => {
  'worklet'
  return fibonacci(50)
})
console.log(`Fibonacci of 50 is ${result}`)
```

## runOnJS

Purpose: `runOnJS` is used to call a JavaScript function from within a worklet. Since worklets run on a separate thread, they cannot directly call JavaScript functions. `runOnJS` bridges this gap by allowing you to invoke JavaScript functions on the JavaScript thread.

When to use: Use it when you need to communicate from the worklet thread back to the JavaScript thread.

Example:

```
import { runOnJS } from 'react-native-worklets-core';
...
const [age, setAge] = useState(30)

function something() {
  'worklet'
  runOnJS(() => setAge(50))
}
```

## useWorklet

Purpose: `useWorklet` is a hook that allows you to define a worklet function directly within your React component. It ensures that the function is properly marked as a worklet and can run on the worklet thread.

When to use: Use this hook on a component when you need to define a function that will execute on the worklet thread.

Example:

```
import { useWorklet } from 'react-native-worklets-core';

function MyComponent() {
  const myWorklet = useWorklet('default', () => {
    'worklet';
    console.log('This is running on the worklet thread');
  }, []);

  return (
    <Button title="Run Worklet" onPress={() => myWorklet()} />
  );
}
```

## useRunOnJS

Purpose: `useRunOnJS` is a hook that allows you to define a JavaScript function that can be safely called from a worklet. It ensures that the function is properly wrapped to run on the JavaScript thread when invoked from the worklet thread.

When to use: Use this hook when you need to call a JavaScript function from a worklet.

```
import { useRunOnJS } from 'react-native-worklets-core';

function App() {
  const sayHello = useRunOnJS(() => {
    console.log("hello from JS!")
  }, [])

  const worklet = useWorklet('default', () => {
    'worklet'
    console.log("hello from worklet!")
    sayHello()
  }, [sayHello])

  return (
    <Button title="Run Worklet" onPress={() => worklet()} />
  );
}

```

## useSharedValue

Purpose:
`useSharedValue` is a hook that creates a SharedValue instance, which can be read from and written to by both the JavaScript thread and the worklet thread simultaneously.

For arrays and objects, useSharedValue creates a C++-based proxy implementation, ensuring that all read and write operations on these data structures are thread-safe.

When to use:
Use `useSharedValue` when you need to share state between the JavaScript thread and the worklet thread.

Example:

```
function App() {
  const something = useSharedValue(5)
  const worklet = useWorklet('default', () => {
    'worklet'
    something.value = Math.random()
  }, [something])
}
```

## Separate Threads/Contexts (Worklets.createContext)

Purpose:
Worklets.createContext is a method that allows you to create a separate thread (context) for running worklets.

Each thread created with createContext operates in isolation, ensuring that tasks in one thread do not interfere with tasks in another.

When to use:
Use Worklets.createContext when you need to offload heavy computations or background tasks to multiple separate threads.

```
const context1 = Worklets.createContext('my-new-thread-1')
const context2 = Worklets.createContext('my-new-thread-2')
context1.runAsync(() => {
  'worklet'
  console.log("Hello from context #1!")
  context2.runAsync(() => {
    'worklet'
    console.log("Hello from context #2!")
  })
})
```

## Worklet Examples

WorkletExampleComponent.tsx

```
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRunOnJS, useSharedValue, useWorklet } from 'react-native-worklets-core';

const WorkletExampleComponent = () => {

    const sharedValue = useSharedValue(0);

    const [result, setResult] = useState(0);

    const setResultFromWorklet = useRunOnJS(() => {
        console.log("Calling main JS from worklet!")
        setResult(sharedValue.value)
    }, [])

    const heavyComputationWorklet = useWorklet('default', () => {
        'worklet'
        console.log("Calling worklet!")
        let result = 0;
        for (let i = 0; i < 10000000; i++) {
            result += Math.random();
        }
        sharedValue.value += result;
        setResultFromWorklet()
    }, [sharedValue, setResultFromWorklet])

    const mainJSFunction = () => {
        console.log("hello from main JS function!", sharedValue.value)
        heavyComputationWorklet()
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Worklet Hooks Example</Text>

            <View style={styles.infoBox}>

                <TouchableOpacity style={styles.tertiaryButton} onPress={mainJSFunction}>
                    <Text style={styles.buttonText}>Heavy Computation</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.messageText}>Result: {result}</Text>
            </View>

            <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>
                    This component demonstrates:
                    {'\n'}• useSharedValue: Shared counter between threads
                    {'\n'}• useWorklet: Functions running on worklet thread
                    {'\n'}• useRunOnJS: Safe JS calls from worklets
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    infoBox: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    counterText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    messageText: {
        fontSize: 14,
        color: '#666',
    },
    buttonContainer: {
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: '#34C759',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    tertiaryButton: {
        backgroundColor: '#FF9500',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    descriptionBox: {
        padding: 16,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
    descriptionText: {
        fontSize: 12,
        color: '#666',
        lineHeight: 18,
    },
});

export default WorkletExampleComponent;
```

WorkletExampleFunctions.ts

```
import { Worklets } from 'react-native-worklets-core';

// Example 1: Heavy computation using runAsync
const fibonacci = (num: number): number => {
  'worklet';
  if (num <= 1) return num;
  let prev = 0, curr = 1;
  for (let i = 2; i <= num; i++) {
    let next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
};

export const calculateFibonacci = async (num: number): Promise<number> => {
  const context = Worklets.defaultContext;
  const result = await context.runAsync(() => {
    'worklet';
    return fibonacci(num);
  });
  return result;
};

// Example 2: Array processing on worklet thread
export const processLargeArray = async (data: number[]): Promise<number[]> => {
  const context = Worklets.defaultContext;

  return await context.runAsync(() => {
    'worklet';
    // Heavy array processing that would block the UI thread
    return data
      .map(x => x * 2)
      .filter(x => x > 10)
      .map(x => Math.sqrt(x))
      .sort((a, b) => b - a);
  });
};

// Example 3: Using separate contexts for parallel processing
export const parallelProcessing = async (
  data1: number[],
  data2: number[]
): Promise<{result1: number, result2: number}> => {
  const context1 = Worklets.createContext('worker-1');
  const context2 = Worklets.createContext('worker-2');

  // Process both arrays in parallel on different threads
  const [result1, result2] = await Promise.all([
    context1.runAsync(() => {
      'worklet';
      console.log('Processing on worker-1');
      return data1.reduce((sum, val) => sum + Math.pow(val, 2), 0);
    }),
    context2.runAsync(() => {
      'worklet';
      console.log('Processing on worker-2');
      return data2.reduce((sum, val) => sum + Math.pow(val, 3), 0);
    })
  ]);

  return { result1, result2 };
};
```
