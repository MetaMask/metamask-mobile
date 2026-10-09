import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor as MMDSIconColor,
} from '@metamask/design-system-react-native';

import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { RootState } from '../../../../../reducers';
import { selectCardActiveProviderId } from '../../../../../selectors/cardController';
import { withCardProvider } from '../../util/metrics';

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
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const flagsResolved = useSelector(
    (state: RootState) =>
      (state.engine.backgroundState.RemoteFeatureFlagController
        ?.cacheTimestamp ?? 0) > 0,
  );

  const hasTrackedViewedEvent = useRef(false);

  useEffect(() => {
    // Wait until the active provider is known so we don't permanently lock null.
    if (hasTrackedViewedEvent.current || !flagsResolved || !activeProviderId) {
      return;
    }
    hasTrackedViewedEvent.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_VIEWED)
        .addProperties(withCardProvider(activeProviderId))
        .build(),
    );
  }, [trackEvent, createEventBuilder, flagsResolved, activeProviderId]);

  return (
    <ButtonIcon
      iconProps={{ color: MMDSIconColor.IconDefault }}
      onPress={onPress}
      iconName={IconName.Card}
      size={ButtonIconSize.Md}
      testID={WalletViewSelectorsIDs.CARD_BUTTON}
      hitSlop={touchAreaSlop}
    />
  );
};

export default CardButton;
