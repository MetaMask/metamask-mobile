import { useContext, useCallback, useRef, useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import { StateSubscriptionServiceContext } from '../components/ControllerStateProvider';

interface BackgroundStateLike {
  [controllerName: string]: unknown;
}

/**
 * Migration compatibility hook. Drop-in for useSelector during the
 * transition from the monolithic engine slice.
 *
 * Assembles a backgroundState-shaped object from the declared controller
 * proxies so existing selectors work unchanged. Only subscribes to the
 * declared controllers.
 *
 * Incorrect controllerDeps produce visible stale-render test failures.
 *
 * @example
 * ```ts
 * // Before
 * const tokens = useSelector(selectTokens);
 * // After — only runs when TokensController changes
 * const tokens = useControllerSelector(selectTokens, ['TokensController']);
 * ```
 */
export function useControllerSelector<R>(
  selector: (state: { engine: { backgroundState: BackgroundStateLike } }) => R,
  controllerDeps: string[],
): R {
  const service = useContext(StateSubscriptionServiceContext);
  if (!service) {
    throw new Error(
      'useControllerSelector must be used within <ControllerStateProvider>',
    );
  }

  const proxies = useMemo(
    () => controllerDeps.map((name) => ({ name, proxy: service.getProxy(name) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [service, ...controllerDeps],
  );

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const unsubscribers = proxies.map(({ proxy }) =>
        proxy.subscribe(onStoreChange),
      );
      return () => {
        for (const unsub of unsubscribers) unsub();
      };
    },
    [proxies],
  );

  const prevSnapshots = useRef<Map<string, unknown>>(new Map());
  const prevComposite = useRef<{ engine: { backgroundState: BackgroundStateLike } } | undefined>(undefined);
  const prevResult = useRef<R | undefined>(undefined);

  const getSnapshot = useCallback((): R => {
    let changed = prevComposite.current === undefined;

    for (const { name, proxy } of proxies) {
      const snap = proxy.getSnapshot();
      if (prevSnapshots.current.get(name) !== snap) {
        prevSnapshots.current.set(name, snap);
        changed = true;
      }
    }

    if (!changed && prevResult.current !== undefined) {
      return prevResult.current;
    }

    const backgroundState: BackgroundStateLike = {};
    for (const { name } of proxies) {
      backgroundState[name] = prevSnapshots.current.get(name);
    }
    const composite = { engine: { backgroundState } };
    prevComposite.current = composite;

    const result = selector(composite);
    prevResult.current = result;
    return result;
  }, [proxies, selector]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
