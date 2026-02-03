import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../component-library/hooks';
import MainActionButton from '../../../../component-library/components-temp/MainActionButton';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { useSelector } from 'react-redux';
import { selectCanSignTransactions } from '../../../../selectors/accountsController';
import Routes from '../../../../constants/navigation/Routes';
import useDepositEnabled from '../../Ramp/Deposit/hooks/useDepositEnabled';
import { useMetrics } from '../../../hooks/useMetrics';
import {
  trackActionButtonClick,
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../../util/analytics/actionButtonTracking';

const styleSheet = () =>
  StyleSheet.create({
    activitiesButton: {
      width: '100%',
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
    },
    buttonContainer: {
      flex: 1,
      overflow: 'hidden',
    },
  });

export interface AssetDetailsActionsProps {
  hasPerpsMarket: boolean;
  hasBalance: boolean;
  isBuyable: boolean;
  onBuy?: () => void;
  onLong?: () => void;
  onShort?: () => void;
  onSend: () => void;
  onReceive: () => void;
  onMore: () => void;
  asset?: {
    assetId?: string;
    address?: string;
    chainId?: string;
  };
  // Optional custom action IDs
  buyButtonActionID?: string;
  longButtonActionID?: string;
  shortButtonActionID?: string;
  sendButtonActionID?: string;
  receiveButtonActionID?: string;
  moreButtonActionID?: string;
}

export const AssetDetailsActions: React.FC<AssetDetailsActionsProps> = ({
  hasPerpsMarket,
  hasBalance,
  isBuyable,
  onBuy,
  onLong,
  onShort,
  onSend,
  onReceive,
  onMore,
  asset,
  buyButtonActionID = TokenOverviewSelectorsIDs.BUY_BUTTON,
  longButtonActionID = TokenOverviewSelectorsIDs.LONG_BUTTON,
  shortButtonActionID = TokenOverviewSelectorsIDs.SHORT_BUTTON,
  sendButtonActionID = TokenOverviewSelectorsIDs.SEND_BUTTON,
  receiveButtonActionID = TokenOverviewSelectorsIDs.RECEIVE_BUTTON,
  moreButtonActionID = TokenOverviewSelectorsIDs.MORE_BUTTON,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const navigation = useNavigation();
  const { navigate } = navigation;
  const { trackEvent, createEventBuilder } = useMetrics();

  // Prevent rapid navigation clicks - locks all buttons during navigation
  const navigationLockRef = useRef(false);

  // Reset lock when screen comes into focus (handles return from navigation)
  useFocusEffect(
    useCallback(() => {
      navigationLockRef.current = false;
    }, []),
  );

  // Listen to navigation state changes to unlock when navigation completes or fails
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      navigationLockRef.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  // Check if FundActionMenu would be empty
  const { isDepositEnabled } = useDepositEnabled();
  const isBuyMenuAvailable = isDepositEnabled || true;

  // Button should be enabled if we have standard funding options OR a custom onBuy function
  const isBuyingAvailable = isBuyMenuAvailable || !!onBuy;

  // Wrapper to prevent rapid navigation clicks
  const withNavigationLock = useCallback((callback: () => void) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    callback();
  }, []);

  const handleBuyPress = useCallback(() => {
    withNavigationLock(() => {
      trackActionButtonClick(trackEvent, createEventBuilder, {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: strings('asset_overview.cash_buy_button'),
        location: ActionLocation.HOME,
      });

      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.FUND_ACTION_MENU,
        params: {
          onBuy,
          asset,
        },
      });
    });
  }, [
    withNavigationLock,
    trackEvent,
    createEventBuilder,
    navigate,
    onBuy,
    asset,
  ]);

  const handleLongPress = useCallback(() => {
    withNavigationLock(() => {
      onLong?.();
    });
  }, [withNavigationLock, onLong]);

  const handleShortPress = useCallback(() => {
    withNavigationLock(() => {
      onShort?.();
    });
  }, [withNavigationLock, onShort]);

  const handleSendPress = useCallback(() => {
    withNavigationLock(onSend);
  }, [withNavigationLock, onSend]);

  const handleReceivePress = useCallback(() => {
    withNavigationLock(onReceive);
  }, [withNavigationLock, onReceive]);

  const handleMorePress = useCallback(() => {
    withNavigationLock(onMore);
  }, [withNavigationLock, onMore]);

  // Determine which buttons to display based on perps market and balance
  // IF no perps market:
  //   IF buyable: ["Cash Buy", "Send", "Receive", "More"]
  //   IF not buyable: ["Send", "Receive", "More"]
  // IF has perps market:
  //   IF has balance: ["Long", "Short", "Send", "More"]
  //   IF no balance: ["Long", "Short", "Receive", "More"]
  const buttons = useMemo(() => {
    if (!hasPerpsMarket) {
      const noPerpsButtons = [];

      if (isBuyable) {
        noPerpsButtons.push({
          key: 'buy',
          iconName: IconName.AttachMoney,
          label: strings('asset_overview.cash_buy_button'),
          onPress: handleBuyPress,
          isDisabled: !isBuyingAvailable,
          testID: buyButtonActionID,
        });
      }

      noPerpsButtons.push(
        {
          key: 'send',
          iconName: IconName.Send,
          label: strings('asset_overview.send_button'),
          onPress: handleSendPress,
          isDisabled: !canSignTransactions,
          testID: sendButtonActionID,
        },
        {
          key: 'receive',
          iconName: IconName.Received,
          label: strings('asset_overview.receive_button'),
          onPress: handleReceivePress,
          isDisabled: false,
          testID: receiveButtonActionID,
        },
        {
          key: 'more',
          iconName: IconName.MoreHorizontal,
          label: strings('asset_overview.more_button'),
          onPress: handleMorePress,
          isDisabled: false,
          testID: moreButtonActionID,
        },
      );

      return noPerpsButtons;
    }

    // Has perps market
    const baseButtons = [
      {
        key: 'long',
        iconName: IconName.TrendUp,
        label: strings('asset_overview.long_button'),
        onPress: handleLongPress,
        isDisabled: !onLong,
        testID: longButtonActionID,
      },
      {
        key: 'short',
        iconName: IconName.TrendDown,
        label: strings('asset_overview.short_button'),
        onPress: handleShortPress,
        isDisabled: !onShort,
        testID: shortButtonActionID,
      },
    ];

    if (hasBalance) {
      // ["Long", "Short", "Send", "More"]
      return [
        ...baseButtons,
        {
          key: 'send',
          iconName: IconName.Send,
          label: strings('asset_overview.send_button'),
          onPress: handleSendPress,
          isDisabled: !canSignTransactions,
          testID: sendButtonActionID,
        },
        {
          key: 'more',
          iconName: IconName.MoreHorizontal,
          label: strings('asset_overview.more_button'),
          onPress: handleMorePress,
          isDisabled: false,
          testID: moreButtonActionID,
        },
      ];
    }

    // No balance: ["Long", "Short", "Receive", "More"]
    return [
      ...baseButtons,
      {
        key: 'receive',
        iconName: IconName.Received,
        label: strings('asset_overview.receive_button'),
        onPress: handleReceivePress,
        isDisabled: false,
        testID: receiveButtonActionID,
      },
      {
        key: 'more',
        iconName: IconName.MoreHorizontal,
        label: strings('asset_overview.more_button'),
        onPress: handleMorePress,
        isDisabled: false,
        testID: moreButtonActionID,
      },
    ];
  }, [
    hasPerpsMarket,
    hasBalance,
    isBuyable,
    handleBuyPress,
    handleLongPress,
    handleShortPress,
    handleSendPress,
    handleReceivePress,
    handleMorePress,
    isBuyingAvailable,
    canSignTransactions,
    onLong,
    onShort,
    buyButtonActionID,
    longButtonActionID,
    shortButtonActionID,
    sendButtonActionID,
    receiveButtonActionID,
    moreButtonActionID,
  ]);

  return (
    <View style={styles.activitiesButton}>
      {buttons.map((button) => (
        <View key={button.key} style={styles.buttonContainer}>
          <MainActionButton
            iconName={button.iconName}
            label={button.label}
            onPress={button.onPress}
            isDisabled={button.isDisabled}
            testID={button.testID}
          />
        </View>
      ))}
    </View>
  );
};

export default AssetDetailsActions;
