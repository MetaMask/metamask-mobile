import { isEqual } from 'lodash';
import { useRef } from 'react';

// using Lodash isEqual deep comparison instead of default useMemo shallow comparison
const dependenciesChanged = (current: any[], previous: any[] | undefined) =>
  !isEqual(current, previous);

const useDeepComparisonMemo = <T>(factory: () => T, dependencies: any[]): T => {
  const ref = useRef<{ value: T; dependencies: any[] }>();

  if (dependenciesChanged(dependencies, ref.current?.dependencies)) {
    ref.current = {
      value: factory(),
      dependencies,
    };
  }

  // return the current value if it exists, otherwise return the factory value as it's the first render
  // if the dependencies have changed, the ref will be updated with the new value
  return ref.current?.value || factory();
};

export default useDeepComparisonMemo;
