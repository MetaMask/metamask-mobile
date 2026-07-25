import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectCanSignTransactions } from '../../../../../../selectors/accountsController';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

const BuyButton = ({
  actionPosition,
  allowTwoLineLabel,
}: HomepageActionButtonSlotProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const label = strings('homepage.action_buttons.buy');

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.BUY,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });
    // Open FundActionMenu so gated options (e.g. Memecoins) can appear alongside Buy/Sell.
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.FUND_ACTION_MENU,
    });
  }, [actionPosition, createEventBuilder, label, navigation, trackEvent]);

  return (
    <HomepageActionButton
      allowTwoLineLabel={allowTwoLineLabel}
      iconName={IconName.Add}
      isDisabled={!canSignTransactions}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.BUY_BUTTON}
    />
  );
};

export default BuyButton;
