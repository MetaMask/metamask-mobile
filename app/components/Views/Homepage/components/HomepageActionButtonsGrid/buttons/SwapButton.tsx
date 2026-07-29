import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import AppConstants from '../../../../../../core/AppConstants';
import { selectIsSwapsEnabled } from '../../../../../../core/redux/slices/bridge';
import type { RootState } from '../../../../../../reducers';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../../../UI/Bridge/hooks/useSwapBridgeNavigation';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

const SwapButton = ({
  actionPosition,
  allowTwoLineLabel,
}: HomepageActionButtonSlotProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isSwapsEnabled = useSelector((state: RootState) =>
    selectIsSwapsEnabled(state),
  );
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.MainView,
    sourcePage: 'MainView',
    skipActionButtonClickTracking: true,
  });
  const label = strings('homepage.action_buttons.swap');
  const isDisabled = !AppConstants.SWAPS.ACTIVE || !isSwapsEnabled;

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.SWAP,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });
    goToSwaps();
  }, [actionPosition, createEventBuilder, goToSwaps, label, trackEvent]);

  return (
    <HomepageActionButton
      allowTwoLineLabel={allowTwoLineLabel}
      iconName={IconName.SwapVertical}
      isDisabled={isDisabled}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.SWAP_BUTTON}
    />
  );
};

export default SwapButton;
