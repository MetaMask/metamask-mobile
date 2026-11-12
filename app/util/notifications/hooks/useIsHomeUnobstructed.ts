import { useEffect, useState } from 'react';
import NavigationService from '../../../core/NavigationService';
import { useIsHomeNavigationPending } from '../../navigation/homeNavigationHandoff';
import { isHomeUnobstructedState } from '../../navigation/isHomeUnobstructedState';

export { isHomeUnobstructedState } from '../../navigation/isHomeUnobstructedState';

/**
 * Tracks whether home is unobstructed, re-evaluated on every navigation state
 * change. Only re-renders when that boolean changes.
 */
export const useIsHomeUnobstructed = (): boolean => {
  const isNavigationPending = useIsHomeNavigationPending();
  const [isUnobstructed, setIsUnobstructed] = useState(() =>
    isHomeUnobstructedState(NavigationService.navigation.getRootState()),
  );

  useEffect(() => {
    const { navigation } = NavigationService;
    const apply = () => {
      setIsUnobstructed(isHomeUnobstructedState(navigation.getRootState()));
    };
    // The state may have changed between the initial render and subscribing.
    apply();
    // The container's `state` event carries a partial tree that drops the
    // innermost route, so the listener reads the hydrated root instead.
    return navigation.addListener('state', apply);
  }, []);

  return isUnobstructed && !isNavigationPending;
};
