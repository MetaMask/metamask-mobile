import {
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor as MMDSIconColor,
} from '@metamask/design-system-react-native';

import React, { useEffect } from 'react';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectHasViewedCardButton,
  setHasViewedCardButton,
} from '../../../../../core/redux/slices/card';

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
  const dispatch = useDispatch();
  const hasViewedCardButton = useSelector(selectHasViewedCardButton);
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    trackEvent(createEventBuilder(MetaMetricsEvents.CARD_VIEWED).build());
  }, [trackEvent, createEventBuilder]);

  const onPressHandler = () => {
    if (!hasViewedCardButton) {
      dispatch(setHasViewedCardButton(true));
    }
    onPress();
  };

  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.TopRight}
      positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
      badge={
        !hasViewedCardButton ? (
          <BadgeStatus
            testID={WalletViewSelectorsIDs.CARD_BUTTON_BADGE}
            status={BadgeStatusStatus.New}
          />
        ) : null
      }
    >
      <ButtonIcon
        iconProps={{ color: MMDSIconColor.IconDefault }}
        onPress={onPressHandler}
        iconName={IconName.Card}
        size={ButtonIconSize.Lg}
        testID={WalletViewSelectorsIDs.CARD_BUTTON}
        hitSlop={touchAreaSlop}
      />
    </BadgeWrapper>
  );
};

export default CardButton;
