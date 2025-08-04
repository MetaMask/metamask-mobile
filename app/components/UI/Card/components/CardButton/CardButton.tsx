import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor as MMDSIconColor,
} from '@metamask/design-system-react-native';

import React, { useEffect } from 'react';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import Logger from '../../../../../util/Logger';

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
    Logger.log('CardButton', 'Card button mounted');
    trackEvent(createEventBuilder(MetaMetricsEvents.CARD_VIEWED).build());
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
