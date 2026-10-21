import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useABTest } from '../../../../hooks';
import { selectInterimHeaderNavBarEnabled } from '../../../../selectors/featureFlagController/interimHeaderNavBar';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_VARIANTS,
} from '../../../../constants/socialV1';
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
  isSocialHeader: boolean;
  isHeaderSearchEnabled: boolean;
  isSocialTabAllowed: boolean;
  trailingNavBarAction: HeaderNavBarTrailingAction;
}

const INTERIM_CONFIG: HomeNavBarConfig = {
  isRefreshedNavBar: true,
  isCompactHeader: false,
  isInterimHeader: true,
  isSocialHeader: false,
  isHeaderSearchEnabled: false,
  isSocialTabAllowed: false,
  trailingNavBarAction: 'trade',
};

const SOCIAL_CONFIG: HomeNavBarConfig = {
  isRefreshedNavBar: true,
  isCompactHeader: false,
  isInterimHeader: true,
  isSocialHeader: true,
  isHeaderSearchEnabled: false,
  isSocialTabAllowed: true,
  trailingNavBarAction: 'trade',
};

/**
 * Home header and tab bar layout. Social V1 owns its launch composition and
 * reuses the interim Liquid Glass header path. Either override suppresses the
 * TMCU-1276 exposure event. `active_ab_tests` tagging still follows the remote
 * assignment, so pause TMCU-1276 while an override is on. Only the surfaces
 * that own the experiment should pass `trackExposure`.
 */
export const useHomeNavBarConfig = ({
  trackExposure = false,
}: { trackExposure?: boolean } = {}): HomeNavBarConfig => {
  const isInterim = useSelector(selectInterimHeaderNavBarEnabled);
  const { variant: socialV1Variant } = useABTest(
    SOCIAL_V1_AB_KEY,
    SOCIAL_V1_VARIANTS,
    { trackExposure: false },
  );
  const isSocialV1Enabled = socialV1Variant.useSocialV1;
  const { variant } = useABTest(
    HEADER_NAV_BAR_AB_KEY,
    HEADER_NAV_BAR_VARIANTS,
    {
      ...HEADER_NAV_BAR_AB_TEST_EXPOSURE_OPTIONS,
      trackExposure: trackExposure && !isInterim && !isSocialV1Enabled,
    },
  );

  return useMemo(() => {
    if (isSocialV1Enabled) {
      return SOCIAL_CONFIG;
    }

    if (isInterim) {
      return INTERIM_CONFIG;
    }

    return {
      isRefreshedNavBar: variant.isCompactHeaderEnabled,
      isCompactHeader: variant.isCompactHeaderEnabled,
      isInterimHeader: false,
      isSocialHeader: false,
      isHeaderSearchEnabled: variant.isHeaderSearchEnabled,
      isSocialTabAllowed: variant.isCompactHeaderEnabled,
      trailingNavBarAction: variant.trailingNavBarAction,
    };
  }, [isInterim, isSocialV1Enabled, variant]);
};
