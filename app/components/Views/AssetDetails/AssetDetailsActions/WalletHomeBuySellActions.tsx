import React, { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  IconName,
  MainActionButton,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { selectCanSignTransactions } from '../../../../selectors/accountsController';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useRampNavigation } from '../../../UI/Ramp/hooks/useRampNavigation';
import { RAMPS_BUY_CUF_SURFACE } from '../../../UI/Ramp/constants/rampsBuyCufTags';
import {
  ActionButtonType,
  ActionLocation,
  ActionPosition,
  trackActionButtonClick,
} from '../../../../util/analytics/actionButtonTracking';

export interface WalletHomeBuySellActionsProps {
  onSend: () => void;
  onReceive: () => void;
  buyButtonActionID: string;
  sellButtonActionID: string;
  sendButtonActionID: string;
  receiveButtonActionID: string;
  containerTestID?: string;
}

/**
 * Wallet home header treatment: Buy, Sell, Send, Receive.
 * Buy and Sell use the existing ramp entry points. Send and Receive stay on
 * the wallet home callbacks. Swap is not in this row.
 */
const WalletHomeBuySellActions = ({
  onSend,
  onReceive,
  buyButtonActionID,
  sellButtonActionID,
  sendButtonActionID,
  receiveButtonActionID,
  containerTestID,
}: WalletHomeBuySellActionsProps) => {
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { goToBuy, goToSell } = useRampNavigation();
  const navigationLockRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      navigationLockRef.current = false;
    }, []),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      navigationLockRef.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  const withNavigationLock = useCallback((callback: () => void) => {
    if (navigationLockRef.current) {
      return;
    }
    navigationLockRef.current = true;
    callback();
  }, []);

  const handleBuyPress = useCallback(() => {
    withNavigationLock(() => {
      trackActionButtonClick(trackEvent, createEventBuilder, {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: strings('asset_overview.buy_button'),
        location: ActionLocation.HOME,
      });
      goToBuy(undefined, { surface: RAMPS_BUY_CUF_SURFACE.HOME });
    });
  }, [withNavigationLock, trackEvent, createEventBuilder, goToBuy]);

  const handleSellPress = useCallback(() => {
    withNavigationLock(() => {
      trackActionButtonClick(trackEvent, createEventBuilder, {
        action_name: ActionButtonType.SELL,
        action_position: ActionPosition.SECOND_POSITION,
        button_label: strings('asset_overview.sell_button'),
        location: ActionLocation.HOME,
      });
      goToSell();
    });
  }, [withNavigationLock, trackEvent, createEventBuilder, goToSell]);

  const handleSendPress = useCallback(() => {
    withNavigationLock(onSend);
  }, [withNavigationLock, onSend]);

  const handleReceivePress = useCallback(() => {
    withNavigationLock(onReceive);
  }, [withNavigationLock, onReceive]);

  return (
    <Box
      accessible={false}
      flexDirection={BoxFlexDirection.Row}
      gap={2}
      paddingHorizontal={4}
      testID={containerTestID}
      twClassName="w-full"
    >
      <MainActionButton
        iconName={IconName.Add}
        isDisabled={!canSignTransactions}
        label={strings('asset_overview.buy_button')}
        onPress={handleBuyPress}
        testID={buyButtonActionID}
        twClassName="min-w-0 flex-1"
      />
      <MainActionButton
        iconName={IconName.Minus}
        isDisabled={!canSignTransactions}
        label={strings('asset_overview.sell_button')}
        onPress={handleSellPress}
        testID={sellButtonActionID}
        twClassName="min-w-0 flex-1"
      />
      <MainActionButton
        iconName={IconName.Arrow2UpRight}
        isDisabled={!canSignTransactions}
        label={strings('asset_overview.send_button')}
        onPress={handleSendPress}
        testID={sendButtonActionID}
        twClassName="min-w-0 flex-1"
      />
      <MainActionButton
        iconName={IconName.Received}
        isDisabled={false}
        label={strings('asset_overview.receive_button')}
        onPress={handleReceivePress}
        testID={receiveButtonActionID}
        twClassName="min-w-0 flex-1"
      />
    </Box>
  );
};

export default WalletHomeBuySellActions;
