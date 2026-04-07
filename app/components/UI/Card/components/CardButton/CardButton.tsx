import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor as MMDSIconColor,
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
} from '@metamask/design-system-react-native';

import React, { useEffect, useRef } from 'react';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  selectHasViewedCardButton,
  setHasViewedCardButton,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  CARD_BUTTON_BADGE_AB_KEY,
  CARD_BUTTON_BADGE_VARIANTS,
} from './abTestConfig';

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
  const { trackEvent, createEventBuilder } = useAnalytics();
  const dispatch = useDispatch();
  const hasViewedCardButton = useSelector(selectHasViewedCardButton);
  const flagsResolved = useSelector(
    (state: RootState) =>
      (state.engine.backgroundState.RemoteFeatureFlagController
        ?.cacheTimestamp ?? 0) > 0,
  );
  const { variant, variantName } = useABTest(
    CARD_BUTTON_BADGE_AB_KEY,
    CARD_BUTTON_BADGE_VARIANTS,
  );

  const hasTrackedViewedEvent = useRef(false);

  useEffect(() => {
    if (hasTrackedViewedEvent.current || !flagsResolved) return;
    hasTrackedViewedEvent.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_VIEWED).build(),
    );
  }, [trackEvent, createEventBuilder, variantName, flagsResolved]);

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
        !hasViewedCardButton && variant.showBadge ? (
          <BadgeStatus
            testID={WalletViewSelectorsIDs.CARD_BUTTON_BADGE}
            status={BadgeStatusStatus.Attention}
          />
        ) : null
      }
    >
      <ButtonIcon
        iconProps={{ color: MMDSIconColor.IconDefault }}
        onPress={onPressHandler}
        iconName={IconName.Card}
        size={ButtonIconSize.Md}
        testID={WalletViewSelectorsIDs.CARD_BUTTON}
        hitSlop={touchAreaSlop}
      />
    </BadgeWrapper>
  );
};

export default CardButton;
