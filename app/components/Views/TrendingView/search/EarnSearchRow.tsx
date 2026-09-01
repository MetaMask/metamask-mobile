import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import EarnMoneyAccountRow from '../feeds/earn/EarnMoneyAccountRow';
import EarnSearchAssetRow from '../feeds/earn/EarnSearchAssetRow';
import type { EarnSearchItem } from '../feeds/earn/earnSearchTypes';
import { useMoneyNavigation } from '../../../UI/Money/hooks/useMoneyNavigation';
import useEarnOpportunityNavigation from '../../../UI/Earn/hooks/useEarnOpportunityNavigation';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';

/**
 * Renders the appropriate Earn search result row and handles navigation.
 *
 * @param item - Money account or Earn asset search result.
 */
const EarnSearchRow = ({ item }: { item: EarnSearchItem }) => {
  const { isOnboardingRedirectNeeded, navigateToMoneyHome } =
    useMoneyNavigation();
  const { navigateFromEarnAsset } = useEarnOpportunityNavigation();

  const privacyMode = useSelector(selectPrivacyMode);

  const handlePress = useCallback(() => {
    if (item.kind === 'money-account') {
      navigateToMoneyHome({ pop: false });
      return;
    }

    navigateFromEarnAsset(item.asset, TokenDetailsSource.ExploreEarn);
  }, [item, navigateFromEarnAsset, navigateToMoneyHome]);

  return item.kind === 'money-account' ? (
    <EarnMoneyAccountRow
      item={item}
      onPress={handlePress}
      isOnboardingRedirectNeeded={isOnboardingRedirectNeeded}
      privacyMode={privacyMode}
    />
  ) : (
    <EarnSearchAssetRow
      item={item}
      onPress={handlePress}
      privacyMode={privacyMode}
    />
  );
};

export default EarnSearchRow;
