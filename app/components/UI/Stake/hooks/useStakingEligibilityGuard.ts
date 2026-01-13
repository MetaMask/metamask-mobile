import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import { RootState } from '../../../../reducers';
import { useBuildPortfolioUrl } from '../../../hooks/useBuildPortfolioUrl';
import useStakingEligibility from './useStakingEligibility';
import { BrowserTab } from '../../Tokens/types';

/**
 * Hook that provides staking eligibility guard functionality.
 * Checks eligibility and redirects to Portfolio if user is not eligible.
 *
 * @returns Object containing eligibility status and guard function
 *
 * @example
 * ```tsx
 * const { isEligible, checkEligibilityAndRedirect } = useStakingEligibilityGuard();
 *
 * const handleStake = () => {
 *   if (!checkEligibilityAndRedirect()) {
 *     return; // User was redirected to Portfolio
 *   }
 *   // Proceed with staking action
 *   navigation.navigate('StakeScreens', { ... });
 * };
 * ```
 */
export const useStakingEligibilityGuard = () => {
  const navigation = useNavigation();
  const { isEligible } = useStakingEligibility();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const browserTabs = useSelector((state: RootState) => state.browser.tabs);

  /**
   * Checks eligibility and redirects to Portfolio if not eligible.
   * @returns true if eligible (caller should proceed), false if redirected
   */
  const checkEligibilityAndRedirect = useCallback((): boolean => {
    if (!isEligible) {
      const existingStakeTab = browserTabs.find((tab: BrowserTab) =>
        tab.url.includes(AppConstants.STAKE.URL),
      );
      let existingTabId;
      let newTabUrl;
      if (existingStakeTab) {
        existingTabId = existingStakeTab.id;
      } else {
        const stakeUrl = buildPortfolioUrlWithMetrics(AppConstants.STAKE.URL);
        newTabUrl = stakeUrl.href;
      }
      const params = {
        ...(newTabUrl && { newTabUrl }),
        ...(existingTabId && { existingTabId, newTabUrl: undefined }),
        timestamp: Date.now(),
      };
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params,
      });
      return false;
    }
    return true;
  }, [isEligible, browserTabs, buildPortfolioUrlWithMetrics, navigation]);

  return {
    isEligible,
    checkEligibilityAndRedirect,
  };
};
