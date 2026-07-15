import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import useDepositEnabled from '../../../../../UI/Ramp/hooks/useDepositEnabled';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

const BuyButton = ({ actionPosition }: HomepageActionButtonSlotProps) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { isDepositEnabled } = useDepositEnabled();
  const isBuyingAvailable = isDepositEnabled || true;
  const label = strings('homepage.action_buttons.buy');

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.BUY,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.FUND_ACTION_MENU,
      params: {},
    });
  }, [actionPosition, createEventBuilder, label, navigation, trackEvent]);

  return (
    <HomepageActionButton
      iconName={IconName.Add}
      isDisabled={!isBuyingAvailable}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.BUY_BUTTON}
    />
  );
};

export default BuyButton;
