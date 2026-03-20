import { useCallback, useRef, useState } from 'react';
import {
  useFocusEffect,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import {
  HomepageEntryPoint,
  HomepageEntryPoints,
} from '../../Homepage/context/HomepageScrollContext';

// React Navigation v5 exposes these via "dangerously" prefixed methods.
// v6 removed the prefix; both variants are supported here.
type NavigationWithParent = NavigationProp<ParamListBase> & {
  dangerouslyGetParent?: () => NavigationWithParent | undefined;
  getParent?: () => NavigationWithParent | undefined;
  dangerouslyGetState?: () => { type: string };
  getState?: () => { type: string };
};

/**
 * Tracks *why* the Homepage is being visited on each focus cycle.
 *
 * Strategy — blur + Tab state comparison:
 * In the `useFocusEffect` cleanup (blur), walk up the navigator tree and record
 * the Tab navigator's active-tab index.  After a tab-press the Tab state has
 * already updated to the new tab's index (≠ 0 for Home); after a back-navigation
 * or modal dismiss within the Home tab the index stays 0.
 * On the *next* focus that stored index determines the entry point.
 *
 * Returns the current `entryPoint` and a monotonically-incrementing `visitId`
 * (bumped on every focus) so consumers can gate work on a new visit.
 */
export function useHomepageEntryPoint(
  navigation: NavigationProp<ParamListBase>,
): {
  entryPoint: HomepageEntryPoint;
  visitId: number;
} {
  const [entryPoint, setEntryPoint] = useState<HomepageEntryPoint>(
    HomepageEntryPoints.APP_OPENED,
  );
  const [visitId, setVisitId] = useState(0);

  // True on the very first focus (app open); cleared immediately after.
  const isFirstFocusRef = useRef(true);
  // Tab navigator's active-tab index recorded during the previous blur.
  const prevTabIndexRef = useRef<number | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let ep: HomepageEntryPoint;
      if (isFirstFocusRef.current) {
        ep = HomepageEntryPoints.APP_OPENED;
        isFirstFocusRef.current = false;
      } else if (
        prevTabIndexRef.current !== undefined &&
        prevTabIndexRef.current !== 0
      ) {
        // Tab navigator was on a non-Home tab before this focus → tab press.
        ep = HomepageEntryPoints.HOME_TAB;
      } else {
        ep = HomepageEntryPoints.NAVIGATED_BACK;
      }
      setEntryPoint(ep);
      setVisitId((prev) => prev + 1);

      return () => {
        // On blur, record the Tab navigator's current active-tab index so the
        // next focus can compare it to determine the entry point.
        const nav = navigation as NavigationWithParent;
        const getParentNav = (
          n: NavigationWithParent,
        ): NavigationWithParent | undefined =>
          n.dangerouslyGetParent?.() ?? n.getParent?.();

        let cur: NavigationWithParent | undefined = getParentNav(nav);
        while (cur) {
          const state = (cur.dangerouslyGetState?.() ?? cur.getState?.()) as
            | { type?: string; index?: number }
            | undefined;
          if (state?.type === 'tab') {
            prevTabIndexRef.current = state.index;
            return;
          }
          cur = getParentNav(cur);
        }
        prevTabIndexRef.current = 0; // fallback: assume same tab
      };
    }, [navigation]),
  );

  return { entryPoint, visitId };
}
