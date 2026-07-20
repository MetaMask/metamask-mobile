import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { BatchSellMetricsLocation } from '@metamask/bridge-controller';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import AppConstants from '../../../../../../core/AppConstants';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectIsSwapsEnabled } from '../../../../../../core/redux/slices/bridge';
import type { RootState } from '../../../../../../reducers';
import { selectBatchSellEnabled } from '../../../../../../selectors/featureFlagController/batchSell';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

/**
 * Opens Batch Sell (trade-menu flow). Label matches Figma "Batch Swap".
 * `batchSellLocation` left as Unknown until analytics defines a home entrypoint.
 */
const BatchSwapButton = ({
  actionPosition,
  allowTwoLineLabel,
}: HomepageActionButtonSlotProps) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isBatchSellEnabled = useSelector(selectBatchSellEnabled);
  const isSwapsEnabled = useSelector((state: RootState) =>
    selectIsSwapsEnabled(state),
  );
  const label = strings('homepage.action_buttons.batch_swap');
  const isDisabled =
    !isBatchSellEnabled || !AppConstants.SWAPS.ACTIVE || !isSwapsEnabled;

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.BATCH_SWAP,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });

    navigation.navigate(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
      params: {
        batchSellLocation: BatchSellMetricsLocation.Unknown,
      },
    });
  }, [actionPosition, createEventBuilder, label, navigation, trackEvent]);

  return (
    <HomepageActionButton
      allowTwoLineLabel={allowTwoLineLabel}
      iconName={IconName.Merge}
      isDisabled={isDisabled}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.BATCH_SWAP_BUTTON}
    />
  );
};

export default BatchSwapButton;
