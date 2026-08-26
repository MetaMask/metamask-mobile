import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import EarnMoneyAccountRow from '../feeds/earn/EarnMoneyAccountRow';
import EarnSearchAssetRow from '../feeds/earn/EarnSearchAssetRow';
import type { EarnSearchItem } from '../feeds/earn/earnSearchTypes';
import { useMoneyNavigation } from '../../../UI/Money/hooks/useMoneyNavigation';
import Routes from '../../../../constants/navigation/Routes';
import {
  earnAssetToToken,
  hasEarnAssetBalance,
} from '../../../UI/Earn/utils/earnAssets';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';

const EarnSearchRow = ({ item }: { item: EarnSearchItem }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { navigateToMoneyHome } = useMoneyNavigation();

  const handlePress = useCallback(() => {
    if (item.kind === 'money-account') {
      navigateToMoneyHome({ pop: false });
      return;
    }

    const { asset } = item;
    if (hasEarnAssetBalance(asset)) {
      navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.STRATEGY_SELECTION,
        params: { assetId: asset.assetId },
      });
      return;
    }

    const token = earnAssetToToken(asset);
    navigation.navigate('Asset', {
      ...token,
      source: TokenDetailsSource.ExploreEarn,
    });
  }, [item, navigateToMoneyHome, navigation]);

  return item.kind === 'money-account' ? (
    <EarnMoneyAccountRow item={item} onPress={handlePress} />
  ) : (
    <EarnSearchAssetRow item={item} onPress={handlePress} />
  );
};

export default EarnSearchRow;
