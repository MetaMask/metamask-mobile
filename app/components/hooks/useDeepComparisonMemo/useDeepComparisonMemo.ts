import { isEqual } from 'lodash';
import { useRef } from 'react';

// using Lodash isEqual deep comparison instead of default useMemo shallow comparison
const dependenciesChanged = (current: any[], previous: any[] | undefined) =>
  !isEqual(current, previous);

const useDeepComparisonMemo = <T>(factory: () => T, dependencies: any[]): T => {
  const ref = useRef<{ value: T; dependencies: any[] }>();

  if (
    !ref.current ||
    dependenciesChanged(dependencies, ref.current?.dependencies)
  ) {
    ref.current = {
      value: factory(),
      dependencies,
    };
  }

  return ref.current.value;
};

export default useDeepComparisonMemo;
