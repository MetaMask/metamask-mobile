import { isEqual } from 'lodash';
import { DependencyList, useRef } from 'react';

/**
 * Identical to `useMemo`, but compares dependencies using deep equality.
 * Should only be used temporarily or as a last resort if dependencies, such
 * as selectors and hooks, cannot be stabilized to return a consistent reference.
 * Ensure dependencies are small otherwise performance cost may be worse than re-rendering.
 */
export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  const depsRef = useRef<DependencyList>(undefined);
  const resultRef = useRef<T>();

  if (!isEqual(depsRef.current, deps)) {
    depsRef.current = deps;
    resultRef.current = factory();
  }

  return resultRef.current as T;
}
