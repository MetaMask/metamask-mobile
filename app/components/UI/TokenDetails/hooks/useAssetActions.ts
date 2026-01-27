import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Hex,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  CaipChainId,
  isCaipAssetType,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { newAssetTransaction } from '../../../../actions/transaction';
import Engine from '../../../../core/Engine';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import Logger from '../../../../util/Logger';
import { getEther } from '../../../../util/transactions';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { getDecimalChainId } from '../../../../util/networks';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import {
  trackActionButtonClick,
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../../util/analytics/actionButtonTracking';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { useRampNavigation } from '../../Ramp/hooks/useRampNavigation';
import { TokenI } from '../../Tokens/types';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
  isAssetFromTrending,
} from '../../Bridge/hooks/useSwapBridgeNavigation';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../constants/bridge';
import {
  getNativeSourceToken,
  getDefaultDestToken,
} from '../../Bridge/utils/tokenUtils';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { useSendNonEvmAsset } from '../../../hooks/useSendNonEvmAsset';
///: END:ONLY_INCLUDE_IF
import {
  formatChainIdToCaip,
  isNativeAddress,
} from '@metamask/bridge-controller';
import { InitSendLocation } from '../../../Views/confirmations/constants/send';
import { useSendNavigation } from '../../../Views/confirmations/hooks/useSendNavigation';
import parseRampIntent from '../../Ramp/utils/parseRampIntent';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { useRampsButtonClickData } from '../../Ramp/hooks/useRampsButtonClickData';
import useRampsUnifiedV1Enabled from '../../Ramp/hooks/useRampsUnifiedV1Enabled';
import { BridgeToken } from '../../Bridge/types';

/**
 * Determines the source and destination tokens for swap/bridge navigation.
 */
export const getSwapTokens = (
  asset: TokenI,
): {
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
} => {
  const wantsToBuyToken = isAssetFromTrending(asset);
  const isNative = isNativeAddress(asset.address);

  const bridgeToken: BridgeToken = {
    ...asset,
    address: asset.address ?? NATIVE_SWAPS_TOKEN_ADDRESS,
    chainId: asset.chainId as Hex | CaipChainId,
    decimals: asset.decimals,
    symbol: asset.symbol,
    name: asset.name,
    image: asset.image,
  };

  if (wantsToBuyToken) {
    if (isNative) {
      return {
        sourceToken: getDefaultDestToken(bridgeToken.chainId),
        destToken: bridgeToken,
      };
    }
    return {
      sourceToken: getNativeSourceToken(bridgeToken.chainId),
      destToken: bridgeToken,
    };
  }

  return {
    sourceToken: bridgeToken,
    destToken: undefined,
  };
};

export interface UseAssetActionsResult {
  onBuy: () => void;
  onSend: () => Promise<void>;
  onReceive: () => void;
  goToSwaps: () => void;
  networkModal: React.ReactNode;
}

export interface UseAssetActionsParams {
  asset: TokenI;
  networkName?: string;
}

/**
 * Hook that provides action handlers for token actions (buy, send, receive, swap).
 * Extracts handler logic from AssetOverview.tsx.
 */
export const useAssetActions = ({
  asset,
  networkName,
}: UseAssetActionsParams): UseAssetActionsResult => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Determine if asset is EVM or non-EVM
  const resultChainId = formatChainIdToCaip(asset.chainId as Hex);
  const isNonEvmAsset = resultChainId === asset.chainId;

  const chainId = asset.chainId as Hex;
  const nativeCurrency = useSelector(
    (state) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).engine?.backgroundState?.NetworkController?.providerConfig
        ?.ticker,
  );

  // Selectors
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const getAccountByScope = useSelector(selectSelectedInternalAccountByScope);
  const selectedChainId = useSelector(selectEvmChainId);
  const rampGeodetectedRegion = useSelector(getDetectedGeolocation);

  // Metrics
  const { trackEvent, createEventBuilder } = useMetrics();

  // Navigation hooks
  const { navigateToSendPage } = useSendNavigation();
  const { goToBuy } = useRampNavigation();
  const rampsButtonClickData = useRampsButtonClickData();
  const rampUnifiedV1Enabled = useRampsUnifiedV1Enabled();

  // Swap/Bridge navigation
  const { sourceToken, destToken } = getSwapTokens(asset);
  const { goToSwaps, networkModal } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: 'MainView',
    sourceToken,
    destToken,
  });

  // Non-EVM send hook
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const { sendNonEvmAsset } = useSendNonEvmAsset({ asset });
  ///: END:ONLY_INCLUDE_IF

  const onReceive = useCallback(() => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.RECEIVE,
      action_position: ActionPosition.FOURTH_POSITION,
      button_label: strings('asset_overview.receive_button'),
      location: ActionLocation.ASSET_DETAILS,
    });

    const accountForChain =
      isNonEvmAsset && asset.chainId
        ? getAccountByScope(asset.chainId as CaipChainId)
        : selectedInternalAccount;

    const addressForChain = accountForChain?.address;

    if (addressForChain && selectedAccountGroup && chainId) {
      navigation.navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: {
          address: addressForChain,
          networkName: networkName || 'Unknown Network',
          chainId,
          groupId: selectedAccountGroup.id,
        },
      });
    } else {
      Logger.error(
        new Error(
          'useAssetActions::onReceive - Missing required data for navigation',
        ),
        {
          hasAddress: !!addressForChain,
          hasAccountGroup: !!selectedAccountGroup,
          hasChainId: !!chainId,
          isNonEvmAsset,
          assetChainId: asset.chainId,
        },
      );
    }
  }, [
    trackEvent,
    createEventBuilder,
    isNonEvmAsset,
    asset.chainId,
    getAccountByScope,
    selectedInternalAccount,
    selectedAccountGroup,
    chainId,
    navigation,
    networkName,
  ]);

  const onSend = useCallback(async () => {
    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.SEND,
      action_position: ActionPosition.THIRD_POSITION,
      button_label: strings('asset_overview.send_button'),
      location: ActionLocation.ASSET_DETAILS,
    });

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const wasHandledAsNonEvm = await sendNonEvmAsset(
      InitSendLocation.AssetOverview,
    );
    if (wasHandledAsNonEvm) {
      return;
    }
    ///: END:ONLY_INCLUDE_IF

    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });

    if (asset.chainId !== selectedChainId) {
      const { NetworkController, MultichainNetworkController } = Engine.context;
      const networkConfiguration =
        NetworkController.getNetworkConfigurationByChainId(
          asset.chainId as Hex,
        );

      const networkClientId =
        networkConfiguration?.rpcEndpoints?.[
          networkConfiguration.defaultRpcEndpointIndex
        ]?.networkClientId;

      await MultichainNetworkController.setActiveNetwork(
        networkClientId as string,
      );
    }

    if ((asset.isETH || asset.isNative) && nativeCurrency) {
      dispatch(newAssetTransaction(getEther(nativeCurrency)));
    } else {
      dispatch(newAssetTransaction(asset));
    }

    navigateToSendPage({ location: InitSendLocation.AssetOverview, asset });
  }, [
    trackEvent,
    createEventBuilder,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    sendNonEvmAsset,
    ///: END:ONLY_INCLUDE_IF
    navigation,
    asset,
    selectedChainId,
    nativeCurrency,
    dispatch,
    navigateToSendPage,
  ]);

  const onBuy = useCallback(() => {
    let assetId: string | undefined;

    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.BUY,
      action_position: ActionPosition.FIRST_POSITION,
      button_label: strings('asset_overview.buy_button'),
      location: ActionLocation.ASSET_DETAILS,
    });

    try {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (isCaipAssetType(asset.address)) {
        assetId = asset.address;
      } else {
        ///: END:ONLY_INCLUDE_IF
        assetId = parseRampIntent({
          chainId: getDecimalChainId(chainId),
          address: asset.address,
        })?.assetId;
        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      }
      ///: END:ONLY_INCLUDE_IF
    } catch {
      assetId = undefined;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          text: 'Buy',
          location: 'TokenDetails',
          chain_id_destination: getDecimalChainId(chainId),
          ramp_type: rampUnifiedV1Enabled ? 'UNIFIED_BUY' : 'BUY',
          region: rampGeodetectedRegion,
          ramp_routing: rampsButtonClickData.ramp_routing,
          is_authenticated: rampsButtonClickData.is_authenticated,
          preferred_provider: rampsButtonClickData.preferred_provider,
          order_count: rampsButtonClickData.order_count,
        })
        .build(),
    );

    goToBuy({ assetId });
  }, [
    trackEvent,
    createEventBuilder,
    asset.address,
    chainId,
    rampUnifiedV1Enabled,
    rampGeodetectedRegion,
    rampsButtonClickData,
    goToBuy,
  ]);

  return {
    onBuy,
    onSend,
    onReceive,
    goToSwaps,
    networkModal,
  };
};

export default useAssetActions;
