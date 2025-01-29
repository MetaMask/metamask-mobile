// Third party dependencies.
import React, { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { swapsUtils } from '@metamask/swaps-controller';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import AppConstants from '../../../core/AppConstants';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
import { swapsLivenessSelector } from '../../../reducers/swaps';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import isBridgeAllowed from '../../UI/Bridge/utils/isBridgeAllowed';
import useGoToBridge from '../../../components/UI/Bridge/utils/useGoToBridge';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';
import { IconName } from '../../../component-library/components/Icons/Icon';
import WalletAction from '../../../components/UI/WalletAction';
import { useStyles } from '../../../component-library/hooks';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import useRampNetwork from '../../UI/Ramp/hooks/useRampNetwork';
import Routes from '../../../constants/navigation/Routes';
import { getDecimalChainId } from '../../../util/networks';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';

// Internal dependencies
import styleSheet from './WalletActions.styles';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { QRTabSwitcherScreens } from '../QRTabSwitcher';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../../UI/Ramp/routes/utils';
import { selectCanSignTransactions } from '../../../selectors/accountsController';
import { WalletActionType } from '../../UI/WalletAction/WalletAction.types';
import Engine from '../../../core/Engine';
import useStakingChain from '../../UI/Stake/hooks/useStakingChain';
import { isStablecoinLendingFeatureEnabled } from '../../UI/Stake/constants';

const WalletActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();
  const goToBridge = useGoToBridge('TabBar');

  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const swapsIsLive = useSelector(swapsLivenessSelector);
  const dispatch = useDispatch();
  const { isStakingSupportedChain } = useStakingChain();
  const [isNetworkRampSupported] = useRampNetwork();
  const { trackEvent, createEventBuilder } = useMetrics();

  const canSignTransactions = useSelector(selectCanSignTransactions);

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const onReceive = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(Routes.QR_TAB_SWITCHER, {
        initialScreen: QRTabSwitcherScreens.Receive,
      });
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RECEIVE_BUTTON_CLICKED)
        .addProperties({
          text: 'Receive',
          tokenSymbol: '',
          location: 'TabBar',
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const onEarn = useCallback(async () => {
    if (!isStakingSupportedChain) {
      await Engine.context.NetworkController.setActiveNetwork('mainnet');
    }

    closeBottomSheetAndNavigate(() => {
      navigate('StakeScreens', { screen: Routes.STAKING.STAKE });
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_BUTTON_CLICKED)
        .addProperties({
          text: 'Earn',
          location: 'TabBar',
          chain_id_destination: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    chainId,
    createEventBuilder,
    trackEvent,
    isStakingSupportedChain,
  ]);

  const onBuy = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(...createBuyNavigationDetails());
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.BUY_BUTTON_CLICKED)
        .addProperties({
          text: 'Buy',
          location: 'TabBar',
          chain_id_destination: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const onSell = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(...createSellNavigationDetails());
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.SELL_BUTTON_CLICKED)
        .addProperties({
          text: 'Sell',
          location: 'TabBar',
          chain_id_source: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const onSend = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate('SendFlowView');
      ticker && dispatch(newAssetTransaction(getEther(ticker)));
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.SEND_BUTTON_CLICKED)
        .addProperties({
          text: 'Send',
          tokenSymbol: '',
          location: 'TabBar',
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    ticker,
    dispatch,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const goToSwaps = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
          sourcePage: 'MainView',
        },
      });
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.SWAP_BUTTON_CLICKED)
        .addProperties({
          text: 'Swap',
          tokenSymbol: '',
          location: 'TabBar',
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const sendIconStyle = useMemo(
    () => ({
      transform: [{ rotate: '-45deg' }],
      ...styles.icon,
    }),
    [styles.icon],
  );

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.actionsContainer}>
        {isNetworkRampSupported && (
          <WalletAction
            actionType={WalletActionType.Buy}
            iconName={IconName.Add}
            onPress={onBuy}
            actionID={WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
            disabled={!canSignTransactions}
          />
        )}
        {isNetworkRampSupported && (
          <WalletAction
            actionType={WalletActionType.Sell}
            iconName={IconName.MinusBold}
            onPress={onSell}
            actionID={WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
            disabled={!canSignTransactions}
          />
        )}
        {AppConstants.SWAPS.ACTIVE &&
          isSwapsAllowed(chainId) && (
            <WalletAction
              actionType={WalletActionType.Swap}
              iconName={IconName.SwapHorizontal}
              onPress={goToSwaps}
              actionID={WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON}
              iconStyle={styles.icon}
              iconSize={AvatarSize.Md}
              disabled={!canSignTransactions || !swapsIsLive}
            />
          )}
        {isBridgeAllowed(chainId) && (
          <WalletAction
            actionType={WalletActionType.Bridge}
            iconName={IconName.Bridge}
            onPress={goToBridge}
            actionID={WalletActionsBottomSheetSelectorsIDs.BRIDGE_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
            disabled={!canSignTransactions}
          />
        )}
        <WalletAction
          actionType={WalletActionType.Send}
          iconName={IconName.Arrow2Right}
          onPress={onSend}
          iconStyle={sendIconStyle}
          actionID={WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON}
          iconSize={AvatarSize.Md}
          disabled={!canSignTransactions}
        />
        <WalletAction
          actionType={WalletActionType.Receive}
          iconName={IconName.Received}
          onPress={onReceive}
          actionID={WalletActionsBottomSheetSelectorsIDs.RECEIVE_BUTTON}
          iconStyle={styles.icon}
          iconSize={AvatarSize.Md}
          disabled={false}
        />
        {isStablecoinLendingFeatureEnabled() && (
          <WalletAction
            actionType={WalletActionType.Earn}
            iconName={IconName.Plant}
            onPress={onEarn}
            actionID={WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
            disabled={!canSignTransactions}
          />
        )}
      </View>
    </BottomSheet>
  );
};

export default WalletActions;
