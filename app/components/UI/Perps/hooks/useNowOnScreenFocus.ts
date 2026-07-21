import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Returns the current epoch-ms timestamp, refreshed whenever the screen
 * regains focus (e.g. returning from another screen, or the app coming back
 * to the foreground while this screen is on top of the stack).
 *
 * Intended for memoized "recently listed" derivations (see `isRecentlyListed`
 * in `../utils/time`) that read `now` as an explicit input: without this,
 * a screen that stays mounted across a 30-day boundary would keep returning
 * a stale memoized result. Refreshing on focus (rather than a continuous
 * timer) is enough to catch the mobile background/foreground case.
 */
export const useNowOnScreenFocus = (): number => {
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );

  return now;
};
