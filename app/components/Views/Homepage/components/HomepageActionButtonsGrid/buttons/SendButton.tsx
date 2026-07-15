import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectCanSignTransactions } from '../../../../../../selectors/accountsController';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

interface SendButtonProps extends HomepageActionButtonSlotProps {
  onSend: () => void;
}

const SendButton = ({ actionPosition, onSend }: SendButtonProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const label = strings('homepage.action_buttons.send');

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.SEND,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });
    onSend();
  }, [actionPosition, createEventBuilder, label, onSend, trackEvent]);

  return (
    <HomepageActionButton
      iconName={IconName.Send}
      isDisabled={!canSignTransactions}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.SEND_BUTTON}
    />
  );
};

export default SendButton;
