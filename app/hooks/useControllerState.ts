import { useContext, useCallback, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { StateSubscriptionServiceContext } from '../components/ControllerStateProvider';

/**
 * Subscribe to a single controller's state with selector support.
 *
 * Only re-evaluates when the subscribed controller changes.
 * For selectors that derive new references (.filter(), .map()),
 * wrap with createSelector to memoize at the input level.
 */
export function useControllerState<S, R = S>(
  controllerName: string,
  selector: (state: S) => R = identity as (state: S) => R,
): R {
  const service = useContext(StateSubscriptionServiceContext);
  if (!service) {
    throw new Error(
      'useControllerState must be used within <ControllerStateProvider>',
    );
  }

  const proxy = service.getProxy<S>(controllerName);

  const prevSnapshot = useRef<S | undefined>(undefined);
  const prevResult = useRef<R | undefined>(undefined);

  const getSnapshot = useCallback((): R => {
    const snapshot = proxy.getSnapshot();
    if (snapshot === prevSnapshot.current && prevResult.current !== undefined) {
      return prevResult.current;
    }
    const result = selector(snapshot);
    prevSnapshot.current = snapshot;
    prevResult.current = result;
    return result;
  }, [proxy, selector]);

  return useSyncExternalStore(proxy.subscribe, getSnapshot);
}

function identity<T>(x: T): T {
  return x;
}
