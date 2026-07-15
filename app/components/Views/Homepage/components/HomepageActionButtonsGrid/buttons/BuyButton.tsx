import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
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

const BuyButton = ({
  actionPosition,
  allowTwoLineLabel,
}: HomepageActionButtonSlotProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { goToBuy } = useRampNavigation();
  const label = strings('homepage.action_buttons.buy');

  const handlePress = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.BUY,
      action_position: actionPosition,
      button_label: label,
      location: ActionLocation.HOME,
    });
    goToBuy();
  }, [actionPosition, createEventBuilder, goToBuy, label, trackEvent]);

  return (
    <HomepageActionButton
      allowTwoLineLabel={allowTwoLineLabel}
      iconName={IconName.Add}
      label={label}
      onPress={handlePress}
      testID={HomepageActionButtonsGridTestIds.BUY_BUTTON}
    />
  );
};

export default BuyButton;
