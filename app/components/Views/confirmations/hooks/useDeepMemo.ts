import { isEqual } from 'lodash';
import { DependencyList, useRef } from 'react';

export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  const depsRef = useRef<DependencyList>([]);
  const resultRef = useRef<T>();

  if (!isEqual(depsRef.current, deps)) {
    depsRef.current = deps;
    resultRef.current = factory();
  }

  return resultRef.current as T;
}
