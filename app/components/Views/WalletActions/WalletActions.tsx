// Third party dependencies.
import React, { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import AppConstants from '../../../core/AppConstants';
import {
  selectChainId,
  selectEvmTicker,
} from '../../../selectors/networkController';
import { swapsLivenessMultichainSelector } from '../../../reducers/swaps';
import { isSwapsAllowed } from '../../../components/UI/Swaps/utils';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getEther } from '../../../util/transactions';
import { newAssetTransaction } from '../../../actions/transaction';
import { IconName } from '../../../component-library/components/Icons/Icon';
import WalletAction from '../../../components/UI/WalletAction';
import { useStyles } from '../../../component-library/hooks';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import useRampNetwork from '../../UI/Ramp/Aggregator/hooks/useRampNetwork';
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
} from '../../UI/Ramp/Aggregator/routes/utils';
import { trace, TraceName } from '../../../util/trace';
// eslint-disable-next-line no-duplicate-imports, import/no-duplicates
import { selectCanSignTransactions } from '../../../selectors/accountsController';
import { WalletActionType } from '../../UI/WalletAction/WalletAction.types';
import { EVENT_LOCATIONS as STAKE_EVENT_LOCATIONS } from '../../UI/Stake/constants/events';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
// eslint-disable-next-line no-duplicate-imports, import/no-duplicates
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';
///: END:ONLY_INCLUDE_IF
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
import { RampType } from '../../../reducers/fiatOrders/types';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../UI/Earn/selectors/featureFlags';
import useDepositEnabled from '../../UI/Ramp/Deposit/hooks/useDepositEnabled';
import { isBridgeAllowed } from '../../UI/Bridge/utils';
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import { EARN_INPUT_VIEW_ACTIONS } from '../../UI/Earn/Views/EarnInputView/EarnInputView.types';
import Engine from '../../../core/Engine';
import { selectMultichainTokenListForAccountId } from '../../../selectors/multichain/multichain';
import { RootState } from '../../../reducers';
import { earnSelectors } from '../../../selectors/earnController/earn';
import { selectIsUnifiedSwapsEnabled } from '../../../core/redux/slices/bridge';
import { useSendNavigation } from '../confirmations/hooks/useSendNavigation';

const WalletActions = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const { navigate } = useNavigation();
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const { earnTokens } = useSelector(earnSelectors.selectEarnTokens);

  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectEvmTicker);
  const swapsIsLive = useSelector(swapsLivenessMultichainSelector);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );
  const dispatch = useDispatch();
  const [isNetworkRampSupported] = useRampNetwork();
  const { isDepositEnabled } = useDepositEnabled();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const { trackEvent, createEventBuilder } = useMetrics();
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  ///: END:ONLY_INCLUDE_IF

  const canSignTransactions = useSelector(selectCanSignTransactions);
  const isUnifiedSwapsEnabled = useSelector(selectIsUnifiedSwapsEnabled);
  const { goToBridge: goToBridgeBase, goToSwaps: goToSwapsBase } =
    useSwapBridgeNavigation({
      location: SwapBridgeNavigationLocation.TabBar,
      sourcePage: 'MainView',
    });
  const { navigateToSendPage } = useSendNavigation();

  const selectedAsset = useSelector(
    (state: RootState) => state.transaction.selectedAsset,
  );

  const multichainTokens = useSelector((state: RootState) =>
    selectedAccount?.id
      ? selectMultichainTokenListForAccountId(state, selectedAccount.id)
      : [],
  );
  const nativeAsset =
    multichainTokens.find((token) => token.isNative) || multichainTokens[0];

  // Hook for handling non-EVM asset sending
  const assetToSend = selectedAsset?.address ? selectedAsset : nativeAsset;
  const { sendNonEvmAsset } = useSendNonEvmAsset({
    asset: assetToSend || { chainId, address: undefined },
    closeModal: () => sheetRef.current?.onCloseBottomSheet(),
  });

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
    closeBottomSheetAndNavigate(() => {
      navigate('StakeModals', {
        screen: Routes.STAKING.MODALS.EARN_TOKEN_LIST,
        params: {
          tokenFilter: {
            includeNativeTokens: true,
            includeStakingTokens: false,
            includeLendingTokens: true,
            includeReceiptTokens: false,
          },
          onItemPressScreen: EARN_INPUT_VIEW_ACTIONS.DEPOSIT,
        },
      });
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_BUTTON_CLICKED)
        .addProperties({
          text: 'Earn',
          location: STAKE_EVENT_LOCATIONS.WALLET_ACTIONS_BOTTOM_SHEET,
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

    trace({
      name: TraceName.LoadRampExperience,
      tags: {
        rampType: RampType.BUY,
      },
    });
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

    trace({
      name: TraceName.LoadRampExperience,
      tags: {
        rampType: RampType.SELL,
      },
    });
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const onDeposit = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(Routes.DEPOSIT.ID);
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          text: 'Deposit',
          location: 'TabBar',
          chain_id_destination: getDecimalChainId(chainId),
          ramp_type: 'DEPOSIT',
        })
        .build(),
    );

    trace({
      name: TraceName.LoadDepositExperience,
    });
  }, [
    closeBottomSheetAndNavigate,
    navigate,
    trackEvent,
    createEventBuilder,
    chainId,
  ]);

  const onSend = useCallback(async () => {
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

    // Try non-EVM first, if handled, return early
    const wasHandledAsNonEvm = await sendNonEvmAsset();
    if (wasHandledAsNonEvm) {
      return;
    }

    if (selectedAsset?.chainId && selectedAsset.chainId !== chainId) {
      const { NetworkController, MultichainNetworkController } = Engine.context;
      const networkConfiguration =
        NetworkController.getNetworkConfigurationByChainId(
          selectedAsset.chainId,
        );
      const networkClientId =
        networkConfiguration?.rpcEndpoints?.[
          networkConfiguration.defaultRpcEndpointIndex
        ]?.networkClientId;
      await MultichainNetworkController.setActiveNetwork(
        networkClientId as string,
      );
    }

    closeBottomSheetAndNavigate(() => {
      let asset = assetToSend;
      if (
        !assetToSend ||
        assetToSend.isETH ||
        assetToSend.isNative ||
        Object.keys(assetToSend).length === 0
      ) {
        if (ticker) {
          asset = getEther(ticker);
          dispatch(newAssetTransaction(asset));
        }
      } else {
        dispatch(newAssetTransaction(assetToSend));
      }
      navigateToSendPage();
    });
  }, [
    closeBottomSheetAndNavigate,
    ticker,
    dispatch,
    trackEvent,
    chainId,
    createEventBuilder,
    selectedAsset,
    assetToSend,
    navigateToSendPage,
    sendNonEvmAsset,
  ]);

  const goToSwaps = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      goToSwapsBase();
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
    goToSwapsBase,
    trackEvent,
    chainId,
    createEventBuilder,
  ]);

  const goToBridge = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      goToBridgeBase();
    });
  }, [closeBottomSheetAndNavigate, goToBridgeBase]);

  const onPerps = useCallback(() => {
    closeBottomSheetAndNavigate(() => {
      navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    });
  }, [closeBottomSheetAndNavigate, navigate]);

  const isEarnWalletActionEnabled = useMemo(() => {
    if (
      !isStablecoinLendingEnabled ||
      (earnTokens.length <= 1 &&
        earnTokens[0]?.isETH &&
        !isPooledStakingEnabled)
    ) {
      return false;
    }
    return true;
  }, [isStablecoinLendingEnabled, earnTokens, isPooledStakingEnabled]);
  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.actionsContainer}>
        {isDepositEnabled && (
          <WalletAction
            actionType={WalletActionType.Deposit}
            iconName={IconName.Money}
            onPress={onDeposit}
            actionID={WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
          />
        )}
        {isNetworkRampSupported && (
          <WalletAction
            actionType={WalletActionType.Buy}
            iconName={IconName.Add}
            onPress={onBuy}
            actionID={WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
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
        {AppConstants.SWAPS.ACTIVE && isSwapsAllowed(chainId) && (
          <WalletAction
            actionType={WalletActionType.Swap}
            iconName={IconName.SwapVertical}
            onPress={goToSwaps}
            actionID={WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
            disabled={!canSignTransactions || !swapsIsLive}
          />
        )}
        {AppConstants.BRIDGE.ACTIVE &&
          isBridgeAllowed(chainId) &&
          !isUnifiedSwapsEnabled && (
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
        {isPerpsEnabled && (
          <WalletAction
            actionType={WalletActionType.Perps}
            iconName={IconName.TrendUp}
            onPress={onPerps}
            actionID={WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON}
            iconStyle={styles.icon}
            iconSize={AvatarSize.Md}
            disabled={!canSignTransactions}
          />
        )}
        <WalletAction
          actionType={WalletActionType.Send}
          iconName={IconName.Send}
          onPress={onSend}
          actionID={WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON}
          iconStyle={styles.icon}
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
        {isEarnWalletActionEnabled && (
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
