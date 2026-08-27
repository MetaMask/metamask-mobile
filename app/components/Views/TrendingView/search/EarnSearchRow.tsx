import React, { useCallback } from 'react';
import EarnMoneyAccountRow from '../feeds/earn/EarnMoneyAccountRow';
import EarnSearchAssetRow from '../feeds/earn/EarnSearchAssetRow';
import type { EarnSearchItem } from '../feeds/earn/earnSearchTypes';
import { useMoneyNavigation } from '../../../UI/Money/hooks/useMoneyNavigation';
import useEarnOpportunityNavigation from '../../../UI/Earn/hooks/useEarnOpportunityNavigation';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';

const EarnSearchRow = ({ item }: { item: EarnSearchItem }) => {
  const { navigateToMoneyHome } = useMoneyNavigation();
  const { navigateToEarnOpportunity } = useEarnOpportunityNavigation({
    tokenDetailsSource: TokenDetailsSource.ExploreEarn,
  });

  const handlePress = useCallback(() => {
    if (item.kind === 'money-account') {
      navigateToMoneyHome({ pop: false });
      return;
    }

    navigateToEarnOpportunity(item.asset);
  }, [item, navigateToEarnOpportunity, navigateToMoneyHome]);

  return item.kind === 'money-account' ? (
    <EarnMoneyAccountRow item={item} onPress={handlePress} />
  ) : (
    <EarnSearchAssetRow item={item} onPress={handlePress} />
  );
};

export default EarnSearchRow;
