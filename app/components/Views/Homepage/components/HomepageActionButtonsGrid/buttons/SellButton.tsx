import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectCanSignTransactions } from '../../../../../../selectors/accountsController';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { useRampNavigation } from '../../../../../UI/Ramp/hooks/useRampNavigation';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

const SellButton = ({ actionPosition }: HomepageActionButtonSlotProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { goToSell } = useRampNavigation();
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const label = strings('homepage.action_buttons.sell');

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.SELL,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });
    goToSell();
  }, [actionPosition, createEventBuilder, goToSell, label, trackEvent]);

  return (
    <HomepageActionButton
      iconName={IconName.Minus}
      isDisabled={!canSignTransactions}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.SELL_BUTTON}
    />
  );
};

export default SellButton;
