# runAsync

Purpose: runAsync is used to execute code on a different thread without blocking the main JS thread.

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

# runOnJS
Purpose: runOnJS is used to call a JavaScript function from within a worklet. Since worklets run on a separate thread, they cannot directly call JavaScript functions. runOnJS bridges this gap by allowing you to invoke JavaScript functions on the JavaScript thread.

When to use: Use it when you need to communicate from the worklet thread back to the JavaScript thread.

Example:
```
import { runOnJS } from 'react-native-worklets-core';
...
const [age, setAge] = useState(30)

function something() {
  'worklet'
  Worklets.runOnJS(() => setAge(50))
}
```

# useWorklet

Purpose: useWorklet is a hook that allows you to define a worklet function directly within your React component. It ensures that the function is properly marked as a worklet and can run on the worklet thread.

When to use: Use this hook when you need to define a function that will execute on the worklet thread.

Example:
```
import { useWorklet } from 'react-native-worklets-core';

function MyComponent() {
  const myWorklet = useWorklet(() => {
    'worklet';
    console.log('This is running on the worklet thread');
  }, []);

  return (
    <Button title="Run Worklet" onPress={() => myWorklet()} />
  );
}
```

# useRunOnJS
Purpose: useRunOnJS is a hook that allows you to define a JavaScript function that can be safely called from a worklet. It ensures that the function is properly wrapped to run on the JavaScript thread when invoked from the worklet thread.

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

# useSharedValue
Purpose:
useSharedValue is a hook that creates a SharedValue instance, which can be read from and written to by both the JavaScript thread and the worklet thread simultaneously.

For arrays and objects, useSharedValue creates a C++-based proxy implementation, ensuring that all read and write operations on these data structures are thread-safe.

When to use:
Use useSharedValue when you need to share state between the JavaScript thread and the worklet thread.

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

# Separate Threads/Contexts (Worklets.createContext)
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

