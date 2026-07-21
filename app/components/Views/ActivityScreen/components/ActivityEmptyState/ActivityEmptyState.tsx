import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Theme,
  useTheme as useDesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
import { Box, TabEmptyState } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectAddressHasTokenBalances } from '../../../../../selectors/tokenBalancesController';
import ActivityEmptyDarkIcon from '../../../../../images/activity-empty-dark.svg';
import ActivityEmptyLightIcon from '../../../../../images/activity-empty-light.svg';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { ActivityTypeFilter } from '../../types';
import {
  ActivityEmptyStateAction,
  getActivityEmptyState,
} from './empty-states';

export interface ActivityEmptyStateProps {
  /** Currently selected type filter — drives copy + CTA. */
  typeFilter: ActivityTypeFilter;
  perpsSubFilterActive?: boolean;
}

/**
 * Filter-aware empty state for the Activity screen. Resolves the right copy,
 * illustration, and CTA based on the active type filter and whether the
 * account has any token balances.
 */
const ActivityEmptyState: React.FC<ActivityEmptyStateProps> = ({
  typeFilter,
  perpsSubFilterActive = false,
}) => {
  const designSystemTheme = useDesignSystemTheme();
  const navigation = useNavigation();
  const { goToBuy } = useRampNavigation();
  const hasFunds = useSelector(selectAddressHasTokenBalances);

  const Icon =
    designSystemTheme === Theme.Dark
      ? ActivityEmptyDarkIcon
      : ActivityEmptyLightIcon;

  const emptyState = getActivityEmptyState({
    filter: typeFilter,
    hasFunds,
    perpsSubFilterActive,
  });

  const handleAction = useCallback(() => {
    switch (emptyState.action) {
      case ActivityEmptyStateAction.Swap:
        navigation.navigate(Routes.BRIDGE.ROOT, {
          screen: Routes.BRIDGE.BRIDGE_VIEW,
        });
        return;
      case ActivityEmptyStateAction.AddFunds:
        goToBuy();
        return;
      case ActivityEmptyStateAction.MakePrediction:
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_LIST,
        });
        return;
      case ActivityEmptyStateAction.BrowsePerpsMarkets:
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_LIST,
        });
        return;
      case ActivityEmptyStateAction.OpenMetamaskCard:
        navigation.navigate(Routes.CARD.ROOT);
        return;
      default:
        return;
    }
  }, [emptyState.action, navigation, goToBuy]);

  return (
    <Box
      testID={ActivityScreenSelectorsIDs.LIST}
      twClassName="flex-1 items-center justify-center pb-32"
    >
      <TabEmptyState
        testID={ActivityScreenSelectorsIDs.EMPTY_STATE}
        icon={<Icon name="activity-empty" width={72} height={78} />}
        description={strings(emptyState.descriptionKey)}
        actionButtonText={strings(emptyState.actionLabelKey)}
        onAction={handleAction}
      />
    </Box>
  );
};

export default ActivityEmptyState;
