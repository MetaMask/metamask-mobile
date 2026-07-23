import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  ActionButtonType,
  ActionLocation,
  trackActionButtonClick,
} from '../../../../../../util/analytics/actionButtonTracking';
import HomepageActionButton from '../HomepageActionButton';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import type { HomepageActionButtonSlotProps } from '../types';

interface ReceiveButtonProps extends HomepageActionButtonSlotProps {
  onReceive: () => void;
}

const ReceiveButton = ({
  actionPosition,
  allowTwoLineLabel,
  onReceive,
}: ReceiveButtonProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const label = strings('homepage.action_buttons.receive');

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.RECEIVE,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });
    onReceive();
  }, [actionPosition, createEventBuilder, label, onReceive, trackEvent]);

  return (
    <HomepageActionButton
      allowTwoLineLabel={allowTwoLineLabel}
      iconName={IconName.Received}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.RECEIVE_BUTTON}
    />
  );
};

export default ReceiveButton;
