import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../component-library/hooks';
import MainActionButton from '../../../../component-library/components-temp/MainActionButton';
import { Skeleton } from '../../../../component-library/components/Skeleton';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { useSelector } from 'react-redux';
import { selectCanSignTransactions } from '../../../../selectors/accountsController';
import Routes from '../../../../constants/navigation/Routes';
import { TokenI } from '../../Tokens/types';

// Height of MainActionButton: paddingVertical (16 * 2) + Icon (24px) + label marginTop (2) + label lineHeight (~16)
const SKELETON_BUTTON_HEIGHT = 74;

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
    skeletonButton: {
      borderRadius: 12,
    },
  });

export interface TokenDetailsActionsProps {
  hasPerpsMarket: boolean;
  hasBalance: boolean;
  isBuyable: boolean;
  isNativeCurrency: boolean;
  token: TokenI;
  onBuy: () => void;
  onLong?: () => void;
  onShort?: () => void;
  onSend: () => void;
  onReceive: () => void;
  isLoading?: boolean;
  /** Optional ref to receive a callback that resets the navigation lock. Used when Long/Short show a modal instead of navigating (e.g. geo block). */
  resetNavigationLockRef?: React.MutableRefObject<(() => void) | null>;
}

/**
 * Skeleton component for TokenDetailsActions.
 * Displays 4 skeleton buttons (maximum button count) to prevent layout shift during loading.
 */
export const TokenDetailsActionsSkeleton: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const skeletonCount = 4; // Maximum number of buttons to prevent layout shift

  return (
    <View style={styles.activitiesButton}>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.buttonContainer}>
          <Skeleton
            width="100%"
            height={SKELETON_BUTTON_HEIGHT}
            style={styles.skeletonButton}
          />
        </View>
      ))}
    </View>
  );
};

export const TokenDetailsActions: React.FC<TokenDetailsActionsProps> = ({
  hasPerpsMarket,
  hasBalance,
  isBuyable,
  isNativeCurrency,
  token,
  onBuy,
  onLong,
  onShort,
  onSend,
  onReceive,
  isLoading = false,
  resetNavigationLockRef,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const navigation = useNavigation();
  const { navigate } = navigation;

  // Prevent rapid navigation clicks - locks all buttons during navigation
  const navigationLockRef = useRef(false);

  // Expose reset so parent can unlock when a non-navigating action ends (e.g. geo block modal dismissed)
  const resetLock = useCallback(() => {
    navigationLockRef.current = false;
  }, []);
  useEffect(() => {
    if (resetNavigationLockRef) {
      resetNavigationLockRef.current = resetLock;
      return () => {
        resetNavigationLockRef.current = null;
      };
    }
  }, [resetNavigationLockRef, resetLock]);

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

  // Wrapper to prevent rapid navigation clicks
  const withNavigationLock = useCallback((callback: () => void) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    callback();
  }, []);

  const handleBuyPress = useCallback(() => {
    withNavigationLock(onBuy);
  }, [withNavigationLock, onBuy]);

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
    withNavigationLock(() => {
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.MORE_TOKEN_ACTIONS_MENU,
        params: {
          hasPerpsMarket,
          hasBalance,
          isBuyable,
          isNativeCurrency,
          asset: token,
          onBuy,
          onReceive,
        },
      });
    });
  }, [
    withNavigationLock,
    navigate,
    hasPerpsMarket,
    hasBalance,
    isBuyable,
    isNativeCurrency,
    token,
    onBuy,
    onReceive,
  ]);

  // Determine which buttons to display based on perps market and balance
  // IF no perps market:
  //   IF buyable:
  //     IF has balance: ["Cash Buy", "Send", "Receive", "More"]
  //     IF no balance: ["Cash Buy", "Receive", "More"]
  //   IF not buyable:
  //     IF has balance: ["Send", "Receive", "More"]
  //     IF no balance: ["Receive", "More"]
  // IF has perps market and geolocation is in a region that supports perps:
  //   IF has balance: ["Long", "Short", "Send", "More"]
  //   IF no balance: ["Long", "Short", "Receive", "More"]
  const buttons = useMemo(() => {
    const actionButtons = [];

    if (hasPerpsMarket) {
      actionButtons.push(
        {
          key: 'long',
          iconName: IconName.TrendUp,
          label: strings('asset_overview.long_button'),
          onPress: handleLongPress,
          isDisabled: !onLong,
          testID: TokenOverviewSelectorsIDs.LONG_BUTTON,
        },
        {
          key: 'short',
          iconName: IconName.TrendDown,
          label: strings('asset_overview.short_button'),
          onPress: handleShortPress,
          isDisabled: !onShort,
          testID: TokenOverviewSelectorsIDs.SHORT_BUTTON,
        },
      );

      if (hasBalance) {
        actionButtons.push({
          key: 'send',
          iconName: IconName.Send,
          label: strings('asset_overview.send_button'),
          onPress: handleSendPress,
          isDisabled: !canSignTransactions,
          testID: TokenOverviewSelectorsIDs.SEND_BUTTON,
        });
      } else {
        actionButtons.push({
          key: 'receive',
          iconName: IconName.QrCode,
          label: strings('asset_overview.receive_button'),
          onPress: handleReceivePress,
          isDisabled: false,
          testID: TokenOverviewSelectorsIDs.RECEIVE_BUTTON,
        });
      }
    } else {
      if (isBuyable) {
        actionButtons.push({
          key: 'buy',
          iconName: IconName.AttachMoney,
          label: strings('asset_overview.cash_buy_button'),
          onPress: handleBuyPress,
          isDisabled: false,
          testID: TokenOverviewSelectorsIDs.BUY_BUTTON,
        });
      }

      if (hasBalance) {
        actionButtons.push({
          key: 'send',
          iconName: IconName.Send,
          label: strings('asset_overview.send_button'),
          onPress: handleSendPress,
          isDisabled: !canSignTransactions,
          testID: TokenOverviewSelectorsIDs.SEND_BUTTON,
        });
      }

      actionButtons.push({
        key: 'receive',
        iconName: IconName.QrCode,
        label: strings('asset_overview.receive_button'),
        onPress: handleReceivePress,
        isDisabled: false,
        testID: TokenOverviewSelectorsIDs.RECEIVE_BUTTON,
      });
    }

    actionButtons.push({
      key: 'more',
      iconName: IconName.MoreHorizontal,
      label: strings('asset_overview.more_button'),
      onPress: handleMorePress,
      isDisabled: false,
      testID: TokenOverviewSelectorsIDs.MORE_BUTTON,
    });

    return actionButtons;
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
    canSignTransactions,
    onLong,
    onShort,
  ]);

  if (isLoading) {
    return <TokenDetailsActionsSkeleton />;
  }

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

export default TokenDetailsActions;
