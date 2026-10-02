import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  Theme,
  useTheme as useDesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { selectAddressHasTokenBalances } from '../../../../../selectors/tokenBalancesController';
import { selectIsCardholder } from '../../../../../selectors/cardController';
import ActivityEmptyIllustrationDark from '../../../../../images/activity-empty-illustration-dark.svg';
import ActivityEmptyIllustrationLight from '../../../../../images/activity-empty-illustration-light.svg';
import ActivityEmptyPerpsDark from '../../../../../images/activity-empty-perps-dark.svg';
import ActivityEmptyPerpsLight from '../../../../../images/activity-empty-perps-light.svg';
import ActivityEmptyPredictionsDark from '../../../../../images/activity-empty-predictions-dark.svg';
import ActivityEmptyPredictionsLight from '../../../../../images/activity-empty-predictions-light.svg';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
import { RAMPS_BUY_CUF_SURFACE } from '../../../../UI/Ramp/constants/rampsBuyCufTags';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import { ActivityTypeFilter } from '../../types';
import {
  ActivityEmptyStateAction,
  ActivityEmptyStateIllustration,
  getActivityEmptyState,
} from './empty-states';
import { BridgeViewMode } from '../../../../UI/Bridge/types';
import { startSwapBridgePageLoadTrace } from '../../../../UI/Bridge/utils/swapBridgePageLoadTrace';

type SvgIllustration = typeof ActivityEmptyIllustrationLight;

/**
 * 8-bit spot illustrations, drawn in a 96×96 frame and shown at 0.75× so the
 * frame matches the 72px used by other empty states (each ~8pt art pixel
 * becomes ~6pt). The search artwork overflows its frame.
 */
const ILLUSTRATIONS: Record<
  ActivityEmptyStateIllustration,
  {
    light: SvgIllustration;
    dark: SvgIllustration;
    width: number;
    height: number;
  }
> = {
  [ActivityEmptyStateIllustration.Search]: {
    light: ActivityEmptyIllustrationLight,
    dark: ActivityEmptyIllustrationDark,
    width: 88,
    height: 79,
  },
  [ActivityEmptyStateIllustration.Predictions]: {
    light: ActivityEmptyPredictionsLight,
    dark: ActivityEmptyPredictionsDark,
    width: 72,
    height: 72,
  },
  [ActivityEmptyStateIllustration.Perps]: {
    light: ActivityEmptyPerpsLight,
    dark: ActivityEmptyPerpsDark,
    width: 72,
    height: 72,
  },
};

export interface ActivityEmptyStateProps {
  /** Currently selected type filter — drives copy + CTA. */
  typeFilter: ActivityTypeFilter;
  perpsSubFilterActive?: boolean;
}

/**
 * Filter-aware empty state for the Activity screen. Resolves the right copy
 * and CTA based on the active type filter and whether the account has any
 * token balances. Fills the space below the filter chips, with the CTA pinned
 * to the bottom.
 */
const ActivityEmptyState: React.FC<ActivityEmptyStateProps> = ({
  typeFilter,
  perpsSubFilterActive = false,
}) => {
  const designSystemTheme = useDesignSystemTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const { goToBuy } = useRampNavigation();
  const hasFunds = useSelector(selectAddressHasTokenBalances);
  const isCardholder = useSelector(selectIsCardholder);

  const emptyState = getActivityEmptyState({
    filter: typeFilter,
    hasFunds,
    perpsSubFilterActive,
    isCardholder,
  });

  const illustration = ILLUSTRATIONS[emptyState.illustration];
  const Illustration =
    designSystemTheme === Theme.Dark ? illustration.dark : illustration.light;

  const handleAction = useCallback(() => {
    switch (emptyState.action) {
      case ActivityEmptyStateAction.Swap:
        {
          const params = startSwapBridgePageLoadTrace({
            sourcePage: 'ActivityEmptyState',
            bridgeViewMode: BridgeViewMode.Unified,
            location: MetaMetricsSwapsEventSource.MainView,
          });

          navigation.navigate(Routes.BRIDGE.ROOT, {
            screen: Routes.BRIDGE.BRIDGE_VIEW,
            params,
          });
        }
        return;
      case ActivityEmptyStateAction.AddFunds:
        goToBuy(undefined, { surface: RAMPS_BUY_CUF_SURFACE.EMPTY_STATE });
        return;
      case ActivityEmptyStateAction.MakePrediction:
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_LIST,
        });
        return;
      case ActivityEmptyStateAction.BrowsePerpsMarkets:
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_LIST,
          params: {},
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
    <Box testID={ActivityScreenSelectorsIDs.LIST} twClassName="flex-1 w-full">
      <Box testID={ActivityScreenSelectorsIDs.EMPTY_STATE} twClassName="flex-1">
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          gap={6}
          paddingHorizontal={4}
          twClassName="flex-1"
        >
          <Illustration
            name={`activity-empty-${emptyState.illustration}`}
            width={illustration.width}
            height={illustration.height}
          />
          <Box alignItems={BoxAlignItems.Center} gap={2}>
            <Text
              variant={TextVariant.HeadingMd}
              color={TextColor.TextDefault}
              twClassName="text-center"
              testID={ActivityScreenSelectorsIDs.EMPTY_STATE_TITLE}
            >
              {strings(emptyState.titleKey)}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
              testID={ActivityScreenSelectorsIDs.EMPTY_STATE_DESCRIPTION}
            >
              {strings(emptyState.descriptionKey)}
            </Text>
          </Box>
        </Box>
        <Box padding={4}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleAction}
            testID={ActivityScreenSelectorsIDs.EMPTY_STATE_ACTION}
          >
            {strings(emptyState.actionLabelKey)}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ActivityEmptyState;
