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