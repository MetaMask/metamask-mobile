import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { usePerpsEventTracking } from './usePerpsEventTracking';

interface NavigationDepthNode {
  getState?: () => { routes?: unknown[] } | undefined;
  getParent?: () => NavigationDepthNode | undefined;
}

/**
 * Total number of routes across this screen's navigator chain up to the root.
 *
 * A pushed child route (same stack or a root modal) increases this count, a pop
 * decreases it, and a tab switch leaves it unchanged (only an index changes).
 * This lets abandon tracking tell a genuine tab-away / backgrounding apart from
 * internal navigation to a child sheet/modal.
 */
function getNavigationStackDepth(navigation: NavigationDepthNode): number {
  let depth = 0;
  let current: NavigationDepthNode | undefined = navigation;
  while (current) {
    const routes = current.getState?.()?.routes;
    if (Array.isArray(routes)) {
      depth += routes.length;
    }
    current = current.getParent?.();
  }
  return depth;
}

/**
 * Emit an `abandon_order` PERPS_UI_INTERACTION when the user leaves a trade
 * screen without committing.
 *
 * Fires on a real exit — back swipe, hardware back, programmatic dismissal
 * (`beforeRemove`) — and on a genuine tab switch away (a `blur` where the
 * navigation depth is unchanged). It does NOT fire when a child route is pushed
 * on top (TP/SL screen, cross-margin modal, payment-token selector: depth
 * increases) nor after the caller marks the flow committed via `hasCommittedRef`.
 * A one-shot guard (reset on focus) prevents double emission from overlapping
 * `beforeRemove`/`blur` events.
 */
export function usePerpsAbandonOrderTracking({
  getAbandonProperties,
  hasCommittedRef,
}: {
  getAbandonProperties: () => Record<string, unknown>;
  hasCommittedRef: MutableRefObject<boolean>;
}): void {
  const navigation = useNavigation();
  const { track } = usePerpsEventTracking();
  const focusStartRef = useRef(0);
  const focusDepthRef = useRef(0);
  const emittedRef = useRef(false);

  const emitAbandon = useCallback(() => {
    if (hasCommittedRef.current || emittedRef.current) {
      return;
    }
    emittedRef.current = true;
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      ...getAbandonProperties(),
      [PERPS_EVENT_PROPERTY.TIME_ON_SCREEN_MS]:
        Date.now() - focusStartRef.current,
    });
  }, [getAbandonProperties, hasCommittedRef, track]);

  useFocusEffect(
    useCallback(() => {
      focusStartRef.current = Date.now();
      focusDepthRef.current = getNavigationStackDepth(navigation);
      emittedRef.current = false;
    }, [navigation]),
  );

  useEffect(() => {
    const onBeforeRemove = () => emitAbandon();
    const onBlur = () => {
      // Unchanged depth => tab switch / backgrounding (a push increases it, a
      // pop decreases it), which is also an abandonment.
      if (getNavigationStackDepth(navigation) === focusDepthRef.current) {
        emitAbandon();
      }
    };
    const unsubscribeRemove = navigation.addListener(
      'beforeRemove',
      onBeforeRemove,
    );
    const unsubscribeBlur = navigation.addListener('blur', onBlur);
    return () => {
      unsubscribeRemove();
      unsubscribeBlur();
    };
  }, [navigation, emitAbandon]);
}
