import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useABTest } from '../../../../hooks';
import { selectInterimHeaderNavBarEnabled } from '../../../../selectors/featureFlagController/interimHeaderNavBar';
import {
  HEADER_NAV_BAR_AB_KEY,
  HEADER_NAV_BAR_AB_TEST_EXPOSURE_OPTIONS,
  HEADER_NAV_BAR_VARIANTS,
  type HeaderNavBarTrailingAction,
} from '../abTestConfig';

export interface HomeNavBarConfig {
  /** Floating tab bar (native tabs on iOS 26) and the refreshed Explore header. */
  isRefreshedNavBar: boolean;
  isCompactHeader: boolean;
  isInterimHeader: boolean;
  isHeaderSearchEnabled: boolean;
  isSocialTabAllowed: boolean;
  trailingNavBarAction: HeaderNavBarTrailingAction;
}

const INTERIM_CONFIG: HomeNavBarConfig = {
  isRefreshedNavBar: true,
  isCompactHeader: false,
  isInterimHeader: true,
  isHeaderSearchEnabled: false,
  isSocialTabAllowed: false,
  trailingNavBarAction: 'trade',
};

/**
 * Home header and tab bar layout. The interim flag wins over the TMCU-1276
 * experiment and suppresses its exposure event. `active_ab_tests` tagging still
 * follows the remote assignment, so pause TMCU-1276 while the interim flag is on.
 * Only the surfaces that own the experiment should pass `trackExposure`.
 */
export const useHomeNavBarConfig = ({
  trackExposure = false,
}: { trackExposure?: boolean } = {}): HomeNavBarConfig => {
  const isInterim = useSelector(selectInterimHeaderNavBarEnabled);
  const { variant } = useABTest(
    HEADER_NAV_BAR_AB_KEY,
    HEADER_NAV_BAR_VARIANTS,
    {
      ...HEADER_NAV_BAR_AB_TEST_EXPOSURE_OPTIONS,
      trackExposure: trackExposure && !isInterim,
    },
  );

  return useMemo(
    () =>
      isInterim
        ? INTERIM_CONFIG
        : {
            isRefreshedNavBar: variant.isCompactHeaderEnabled,
            isCompactHeader: variant.isCompactHeaderEnabled,
            isInterimHeader: false,
            isHeaderSearchEnabled: variant.isHeaderSearchEnabled,
            isSocialTabAllowed: variant.isCompactHeaderEnabled,
            trailingNavBarAction: variant.trailingNavBarAction,
          },
    [isInterim, variant],
  );
};
