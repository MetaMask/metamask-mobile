import { useSelector } from 'react-redux';

import { useABTest } from '../../../../hooks/useABTest';
import { selectNativeTabBarEnabled } from '../../../../selectors/featureFlagController/nativeTabBar';
import {
  HEADER_NAV_BAR_AB_KEY,
  HEADER_NAV_BAR_VARIANTS,
} from '../../../Views/Homepage/abTestConfig';
import { isNativeTabBarSupported } from './homeTabs.mappers';

/** Native iOS 26 tabs for the refreshed nav bar arms, unless killed remotely. */
export const useIsNativeTabBar = (): boolean => {
  // Exposure is tracked by the wallet header and HomeTabs.
  const { variant } = useABTest(
    HEADER_NAV_BAR_AB_KEY,
    HEADER_NAV_BAR_VARIANTS,
    {
      trackExposure: false,
    },
  );
  const isNativeTabBarEnabled = useSelector(selectNativeTabBarEnabled);

  return (
    variant.isCompactHeaderEnabled &&
    isNativeTabBarEnabled &&
    isNativeTabBarSupported()
  );
};

export default useIsNativeTabBar;
