import { useSelector } from 'react-redux';

import { selectNativeTabBarEnabled } from '../../../../selectors/featureFlagController/nativeTabBar';
import { useHomeNavBarConfig } from '../../../Views/Homepage/hooks/useHomeNavBarConfig';
import { isNativeTabBarSupported } from './homeTabs.mappers';

/** Native iOS 26 tabs for the refreshed nav bar arms, unless killed remotely. */
export const useIsNativeTabBar = (): boolean => {
  // Exposure is tracked by the wallet header and HomeTabs.
  const { isRefreshedNavBar } = useHomeNavBarConfig();
  const isNativeTabBarEnabled = useSelector(selectNativeTabBarEnabled);

  return (
    isRefreshedNavBar && isNativeTabBarEnabled && isNativeTabBarSupported()
  );
};

export default useIsNativeTabBar;
