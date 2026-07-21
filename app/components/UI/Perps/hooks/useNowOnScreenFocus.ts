import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Returns the current epoch-ms timestamp, refreshed whenever the screen
 * regains React Navigation focus (e.g. returning from another screen) or the
 * app returns to the foreground (`AppState` becomes `'active'`).
 *
 * Intended for memoized "recently listed" derivations (see `isRecentlyListed`
 * in `../utils/time`) that read `now` as an explicit input: without this,
 * a screen that stays mounted across a 30-day boundary would keep returning
 * a stale memoized result. Navigation focus alone misses the case where the
 * app is backgrounded and resumed while this screen stays on top of the
 * stack — the route never blurs, so the `AppState` listener is needed too.
 */
export const useNowOnScreenFocus = (): number => {
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          setNow(Date.now());
        }
      },
    );
    return () => subscription.remove();
  }, []);

  return now;
};
