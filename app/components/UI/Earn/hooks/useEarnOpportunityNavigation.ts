import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { TokenDetailsSource } from '../../TokenDetails/constants/constants';
import type { EarnAsset } from '../types/earnAssets';
import { earnAssetToToken } from '../utils/earnAssets';
import { isEarnAssetBalanceBelowMinDepositAmount } from '../utils/earnAssets/earnAssetBalance';

interface UseEarnOpportunityNavigationOptions {
  tokenDetailsSource: TokenDetailsSource;
}

/**
 * Navigates an Earn opportunity to strategy selection or Token Details based
 * on whether the asset meets the minimum deposit amount.
 *
 * @param tokenDetailsSource - Attribution source for Token Details navigation.
 * @returns Earn opportunity navigation callback.
 */
const useEarnOpportunityNavigation = ({
  tokenDetailsSource,
}: UseEarnOpportunityNavigationOptions) => {
  const navigation = useNavigation<AppNavigationProp>();

  const navigateToEarnOpportunity = useCallback(
    (asset: EarnAsset) => {
      if (!isEarnAssetBalanceBelowMinDepositAmount(asset)) {
        navigation.navigate(Routes.EARN.ROOT, {
          screen: Routes.EARN.STRATEGY_SELECTION,
          params: { assetId: asset.assetId },
        });
        return;
      }

      const token = earnAssetToToken(asset);
      navigation.navigate('Asset', {
        ...token,
        source: tokenDetailsSource,
      });
    },
    [navigation, tokenDetailsSource],
  );

  return { navigateToEarnOpportunity };
};

export default useEarnOpportunityNavigation;
