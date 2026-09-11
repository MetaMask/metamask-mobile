import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import EarnMoneyAccountRow from '../feeds/earn/EarnMoneyAccountRow';
import EarnSearchAssetRow from '../feeds/earn/EarnSearchAssetRow';
import type { EarnSearchItem } from '../feeds/earn/earnSearchTypes';
import { useMoneyNavigation } from '../../../UI/Money/hooks/useMoneyNavigation';
import useEarnOpportunityNavigation, {
  getEarnOpportunityRedirectTarget,
} from '../../../UI/Earn/hooks/useEarnOpportunityNavigation';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { useMoneyAnalytics } from '../../../UI/Money/hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES as MONEY_COMPONENT_NAMES,
  SCREEN_NAMES as MONEY_SCREEN_NAMES,
} from '../../../UI/Money/constants/moneyEvents';
import { useEarnAnalytics } from '../../../UI/Earn/hooks/useEarnAnalytics';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_SCREEN_NAMES,
} from '../../../UI/Earn/constants/earnModuleEvents';
import type { EarnModuleSurfaceLocation } from '../../../UI/Earn/types/earnModuleEvents.types';
import {
  buildEarnModuleNavigationContext,
  getEarnModuleAssetProperties,
} from '../../../UI/Earn/utils/earnModuleAnalytics';

const EARN_SEARCH_ANALYTICS_CONTEXT: EarnModuleSurfaceLocation = {
  component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SEARCH_ROW,
  screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE_SEARCH,
  entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_SEARCH,
};

/**
 * Renders the appropriate Earn search result row and handles navigation.
 *
 * @param item - Money account or Earn asset search result.
 */
const EarnSearchRow = ({
  item,
  position,
  resultCount,
}: {
  item: EarnSearchItem;
  position: number;
  resultCount?: number;
}) => {
  const { isOnboardingRedirectNeeded, navigateToMoneyHome } =
    useMoneyNavigation();
  const { navigateFromEarnAsset } = useEarnOpportunityNavigation();
  const { trackSurfaceClicked: trackMoneySurfaceClicked } = useMoneyAnalytics({
    component_name: MONEY_COMPONENT_NAMES.MONEY_ACCOUNT_ROW,
    screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE_SEARCH,
  });
  const { trackSurfaceClicked } = useEarnAnalytics(
    EARN_SEARCH_ANALYTICS_CONTEXT,
  );

  const privacyMode = useSelector(selectPrivacyMode);

  const handlePress = useCallback(() => {
    if (item.kind === 'money-account') {
      trackMoneySurfaceClicked({
        redirect_target: isOnboardingRedirectNeeded
          ? MONEY_SCREEN_NAMES.MONEY_ONBOARDING
          : MONEY_SCREEN_NAMES.MONEY_HOME,
      });
      navigateToMoneyHome({ pop: false });
      return;
    }

    trackSurfaceClicked({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SEARCH_ASSET_ROW,
      ...getEarnModuleAssetProperties(item.asset, position, resultCount),
      redirect_target: getEarnOpportunityRedirectTarget(
        item.asset,
        isOnboardingRedirectNeeded,
      ),
    });
    navigateFromEarnAsset(
      item.asset,
      TokenDetailsSource.ExploreSearch,
      buildEarnModuleNavigationContext(
        EARN_SEARCH_ANALYTICS_CONTEXT,
        position,
        resultCount,
      ),
    );
  }, [
    resultCount,
    isOnboardingRedirectNeeded,
    item,
    navigateFromEarnAsset,
    navigateToMoneyHome,
    position,
    trackMoneySurfaceClicked,
    trackSurfaceClicked,
  ]);

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
