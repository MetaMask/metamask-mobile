import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor as MMDSIconColor,
} from '@metamask/design-system-react-native';

import React, { useEffect } from 'react';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

interface CardButtonProps {
  onPress: () => void;
  touchAreaSlop: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

const CardButton: React.FC<CardButtonProps> = ({ onPress, touchAreaSlop }) => {
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_VIEWED).build(),
    );
  }, [trackEvent, createEventBuilder]);

  return (
    <ButtonIcon
      iconProps={{ color: MMDSIconColor.IconDefault }}
      onPress={onPress}
      iconName={IconName.Card}
      size={ButtonIconSize.Lg}
      testID={WalletViewSelectorsIDs.CARD_BUTTON}
      hitSlop={touchAreaSlop}
    />
  );
};

export default CardButton;
