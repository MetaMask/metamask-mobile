import React, { useRef, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import styleSheet from './AssetDetailsActions.styles';
import { useStyles } from '../../../../component-library/hooks';
import MainActionButton from '../../../../component-library/components-temp/MainActionButton';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { TokenOverviewSelectorsIDs } from '../../../UI/AssetOverview/TokenOverview.testIds';
import { useSelector } from 'react-redux';
import { selectCanSignTransactions } from '../../../../selectors/accountsController';
import { selectIsSwapsEnabled } from '../../../../core/redux/slices/bridge';
import Routes from '../../../../constants/navigation/Routes';
import useDepositEnabled from '../../../UI/Ramp/Deposit/hooks/useDepositEnabled';
import { RootState } from '../../../../reducers';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import {
  trackActionButtonClick,
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../../util/analytics/actionButtonTracking';

export interface AssetDetailsActionsProps {
  displayBuyButton: boolean | undefined;
  displaySwapsButton: boolean | undefined;
  onBuy?: () => void;
  goToSwaps: () => void;
  onSend: () => void;
  onReceive: () => void;
  // Asset context for fund flow
  asset?: {
    assetId?: string;
    address?: string;
    chainId?: string;
  };
  // Optional custom action IDs to avoid test ID conflicts
  buyButtonActionID?: string;
  swapButtonActionID?: string;
  sendButtonActionID?: string;
  receiveButtonActionID?: string;
}

export const AssetDetailsActions: React.FC<AssetDetailsActionsProps> = ({
  displayBuyButton,
  displaySwapsButton,
  onBuy,
  goToSwaps,
  onSend,
  onReceive,
  asset,
  buyButtonActionID = TokenOverviewSelectorsIDs.BUY_BUTTON,
  swapButtonActionID = TokenOverviewSelectorsIDs.SWAP_BUTTON,
  sendButtonActionID = TokenOverviewSelectorsIDs.SEND_BUTTON,
  receiveButtonActionID = TokenOverviewSelectorsIDs.RECEIVE_BUTTON,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const canSignTransactions = useSelector(selectCanSignTransactions);
  const isSwapsEnabled = useSelector((state: RootState) =>
    selectIsSwapsEnabled(state),
  );
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
      // Track the home screen Buy button click
      trackActionButtonClick(trackEvent, createEventBuilder, {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: strings('asset_overview.buy_button'),
        location: ActionLocation.HOME,
      });

      // Navigate to FundActionMenu with both custom onBuy and asset context
      // The menu will prioritize custom onBuy over standard funding options
      // This allows custom funding flows even when deposit/ramp are unavailable
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.FUND_ACTION_MENU,
        params: {
          onBuy, // Custom buy function (takes priority if provided)
          asset, // Asset context for standard funding flows
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

  const handleSwapPress = useCallback(() => {
    withNavigationLock(goToSwaps);
  }, [withNavigationLock, goToSwaps]);

  const handleSendPress = useCallback(() => {
    withNavigationLock(onSend);
  }, [withNavigationLock, onSend]);

  const handleReceivePress = useCallback(() => {
    withNavigationLock(onReceive);
  }, [withNavigationLock, onReceive]);

  return (
    <View style={styles.activitiesButton}>
      {displayBuyButton && (
        <View style={styles.buttonContainer}>
          <MainActionButton
            iconName={IconName.AttachMoney}
            label={strings('asset_overview.buy_button')}
            onPress={handleBuyPress}
            isDisabled={!isBuyingAvailable}
            testID={buyButtonActionID}
          />
        </View>
      )}
      {displaySwapsButton && (
        <View style={styles.buttonContainer}>
          <MainActionButton
            iconName={IconName.SwapVertical}
            label={strings('asset_overview.swap')}
            onPress={handleSwapPress}
            isDisabled={!isSwapsEnabled}
            testID={swapButtonActionID}
          />
        </View>
      )}
      <View style={styles.buttonContainer}>
        <MainActionButton
          iconName={IconName.Send}
          label={strings('asset_overview.send_button')}
          onPress={handleSendPress}
          isDisabled={!canSignTransactions}
          testID={sendButtonActionID}
        />
      </View>
      <View style={styles.buttonContainer}>
        <MainActionButton
          iconName={IconName.Received}
          label={strings('asset_overview.receive_button')}
          onPress={handleReceivePress}
          isDisabled={false}
          testID={receiveButtonActionID}
        />
      </View>
    </View>
  );
};

export default AssetDetailsActions;
