/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog.
 * The Header & NavBar experiment config lives in the Homepage route. This hook
 * is the single place Explore reads it, so the violation stays contained here. */
import { useABTest } from '../../../../hooks/useABTest';
import {
  HEADER_NAV_BAR_AB_KEY,
  HEADER_NAV_BAR_VARIANTS,
} from '../../Homepage/abTestConfig';

/**
 * Whether the Explore header shows its refreshed chrome: the browser tab count
 * button, and the back arrow that replaces the Cancel text in search.
 *
 * Rides the Header & NavBar refresh experiment, so both treatment arms get it
 * and control keeps the current header. Exposure is tracked where the
 * experiment surface is owned — the wallet home header and the tab bar — so
 * this read is assignment-only and must not emit `Experiment Viewed`.
 * TODO: Remove this after the experiment is complete.
 */
export const useIsExploreHeaderRefreshEnabled = (): boolean => {
  const { variant } = useABTest(
    HEADER_NAV_BAR_AB_KEY,
    HEADER_NAV_BAR_VARIANTS,
    {
      trackExposure: false,
    },
  );

  return variant.isCompactHeaderEnabled;
};
