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
import { WalletActionsModalSelectorsIDs } from '../../../../e2e/selectors/Modals/WalletActionsModal.selectors';

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

const WalletActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();
  const goToBridge = useGoToBridge('TabBar');

  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);
  const swapsIsLive = useSelector(swapsLivenessSelector);
  const dispatch = useDispatch();

  const [isNetworkRampSupported] = useRampNetwork();
  const { trackEvent } = useMetrics();

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

    trackEvent(MetaMetricsEvents.RECEIVE_BUTTON_CLICKED, {
      text: 'Receive',
      tokenSymbol: '',
      location: 'TabBar',
      chain_id: getDecimalChainId(chainId),
    });
  }, [closeBottomSheetAndNavigate, navigate, trackEvent, chainId]);

  const onBuy = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(...createBuyNavigationDetails());
    });

    trackEvent(MetaMetricsEvents.BUY_BUTTON_CLICKED, {
      text: 'Buy',
      location: 'TabBar',
      chain_id_destination: getDecimalChainId(chainId),
    });
  }, [closeBottomSheetAndNavigate, navigate, trackEvent, chainId]);

  const onSell = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(...createSellNavigationDetails());
    });

    trackEvent(MetaMetricsEvents.SELL_BUTTON_CLICKED, {
      text: 'Sell',
      location: 'TabBar',
      chain_id_source: getDecimalChainId(chainId),
    });
  }, [closeBottomSheetAndNavigate, navigate, trackEvent, chainId]);

  const onSend = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate('SendFlowView');
      ticker && dispatch(newAssetTransaction(getEther(ticker)));
    });

    trackEvent(MetaMetricsEvents.SEND_BUTTON_CLICKED, {
      text: 'Send',
      tokenSymbol: '',
      location: 'TabBar',
      chain_id: getDecimalChainId(chainId),
    });
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    ticker,
    dispatch,
    trackEvent,
    chainId,
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

    trackEvent(MetaMetricsEvents.SWAP_BUTTON_CLICKED, {
      text: 'Swap',
      tokenSymbol: '',
      location: 'TabBar',
      chain_id: getDecimalChainId(chainId),
    });
  }, [closeBottomSheetAndNavigate, navigate, trackEvent, chainId]);

  const walletActionBaseProps = useMemo(
    () => ({
      iconSize: AvatarSize.Md,
      disabled: !canSignTransactions,
    }),
    [canSignTransactions],
  );

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
            actionID={WalletActionsModalSelectorsIDs.BUY_BUTTON}
            iconStyle={styles.icon}
            {...walletActionBaseProps}
          />
        )}
        {isNetworkRampSupported && (
          <WalletAction
            actionType={WalletActionType.Sell}
            iconName={IconName.MinusBold}
            onPress={onSell}
            actionID={WalletActionsModalSelectorsIDs.SELL_BUTTON}
            iconStyle={styles.icon}
            {...walletActionBaseProps}
          />
        )}
        {AppConstants.SWAPS.ACTIVE &&
          swapsIsLive &&
          isSwapsAllowed(chainId) && (
            <WalletAction
              actionType={WalletActionType.Swap}
              iconName={IconName.SwapHorizontal}
              onPress={goToSwaps}
              actionID={WalletActionsModalSelectorsIDs.SWAP_BUTTON}
              iconStyle={styles.icon}
              {...walletActionBaseProps}
            />
          )}
        {isBridgeAllowed(chainId) && (
          <WalletAction
            actionType={WalletActionType.Bridge}
            iconName={IconName.Bridge}
            onPress={goToBridge}
            actionID={WalletActionsModalSelectorsIDs.BRIDGE_BUTTON}
            iconStyle={styles.icon}
            {...walletActionBaseProps}
          />
        )}
        <WalletAction
          actionType={WalletActionType.Send}
          iconName={IconName.Arrow2Right}
          onPress={onSend}
          iconStyle={sendIconStyle}
          actionID={WalletActionsModalSelectorsIDs.SEND_BUTTON}
          {...walletActionBaseProps}
        />
        <WalletAction
          actionType={WalletActionType.Receive}
          iconName={IconName.Received}
          onPress={onReceive}
          actionID={WalletActionsModalSelectorsIDs.RECEIVE_BUTTON}
          iconStyle={styles.icon}
          {...walletActionBaseProps}
          disabled={false}
        />
      </View>
    </BottomSheet>
  );
};

export default WalletActions;
