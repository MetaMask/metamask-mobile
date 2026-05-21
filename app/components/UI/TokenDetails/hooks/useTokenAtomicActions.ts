import { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStore } from 'react-redux';
import { Hex, CaipChainId, isCaipAssetType } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { getDecimalChainId } from '../../../../util/networks';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  trackActionButtonClick,
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../../util/analytics/actionButtonTracking';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { areAddressesEqual } from '../../../../util/address';
import { useRampNavigation } from '../../Ramp/hooks/useRampNavigation';
import { TokenI } from '../../Tokens/types';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../Bridge/hooks/useSwapBridgeNavigation';
import { useSendNonEvmAsset } from '../../../hooks/useSendNonEvmAsset';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { InitSendLocation } from '../../../Views/confirmations/constants/send';
import { useSendNavigation } from '../../../Views/confirmations/hooks/useSendNavigation';
import parseRampIntent from '../../Ramp/utils/parseRampIntent';
import {
  getDetectedGeolocation,
  getOrders,
  getRampRoutingDecision,
} from '../../../../reducers/fiatOrders';
import { selectRampsOrdersForSelectedAccountGroup } from '../../../../selectors/rampsController';
import { getProviderToken } from '../../Ramp/Deposit/utils/ProviderTokenVault';
import {
  completedOrdersFromFiatOrders,
  completedOrdersFromRampsOrders,
} from '../../Ramp/utils/determinePreferredProvider';
import useRampsUnifiedV1Enabled from '../../Ramp/hooks/useRampsUnifiedV1Enabled';
import { BridgeToken } from '../../Bridge/types';
import { adaptTokenSecurityData } from '../../Bridge/utils/tokenSecurityUtils';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { TokenDetailsSource } from '../constants/constants';
import type { RootState } from '../../../../reducers';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export type TokenActionInput = TokenI & {
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  source?: TokenDetailsSource;
};

interface BuySourceAsset {
  chainId: string;
  assetId: string;
  isNative?: boolean;
  decimals: number;
  symbol: string;
  name: string;
  image?: string;
  fiat?: { balance?: number };
}

/**
 * Smart picker for the swap "source" token when the current token has no
 * balance: pick the user's best available asset (highest fiat) to spend.
 *
 * Pure function so it can be invoked lazily at click time (avoiding the
 * full sort/rank pass on every redux update). Mirrors the priority order
 * used by the legacy `buySourceToken` memo:
 * 1. Highest USD-value token on the same chain (excluding current token)
 * 2. Native token with highest USD value across other chains
 * 3. Fallback: highest USD-value token across any chain
 */
export const computeBuySourceToken = (
  userAssetsMap: Record<string, BuySourceAsset[]> | undefined,
  tokenChainId: string | undefined,
  tokenAddress: string,
): BridgeToken | null => {
  const userAssets = Object.values(userAssetsMap || {}).flat();

  // Check if asset has positive fiat balance
  const hasPositiveFiat = (a: { fiat?: { balance?: number } }) =>
    (a.fiat?.balance ?? 0) > 0;

  // Priority 1: Find highest USD value token on same chain (with positive balance)
  // Note: assetId contains the token address for EVM assets
  const sameChainAssets = userAssets
    .filter(
      (a) =>
        a.chainId === tokenChainId &&
        !areAddressesEqual(a.assetId, tokenAddress) &&
        hasPositiveFiat(a),
    )
    .sort((a, b) => (b.fiat?.balance ?? 0) - (a.fiat?.balance ?? 0));

  if (sameChainAssets.length > 0) {
    const asset = sameChainAssets[0];
    return {
      address: asset.assetId,
      chainId: asset.chainId as Hex | CaipChainId,
      decimals: asset.decimals,
      symbol: asset.symbol,
      name: asset.name,
      image: asset.image,
    };
  }

  // Eligible cross-chain assets: exclude exact same token (address + chain match)
  // This allows cross-chain bridging of native tokens that share the zero address
  const crossChainAssets = userAssets
    .filter(
      (a) =>
        !(
          areAddressesEqual(a.assetId, tokenAddress) &&
          a.chainId === tokenChainId
        ) && hasPositiveFiat(a),
    )
    .sort((a, b) => (b.fiat?.balance ?? 0) - (a.fiat?.balance ?? 0));

  // Priority 2: Prefer native tokens (ETH, POL, etc.) with highest fiat balance
  const nativeAsset = crossChainAssets.find((a) => a.isNative);
  if (nativeAsset) {
    return {
      address: nativeAsset.assetId,
      chainId: nativeAsset.chainId as Hex | CaipChainId,
      decimals: nativeAsset.decimals,
      symbol: nativeAsset.symbol,
      name: nativeAsset.name,
      image: nativeAsset.image,
    };
  }

  // Priority 3 – Last swapped token (needs selector/data source)
  // Priority 4 – Most used token (needs selector/data source)

  // Fallback: highest USD value token on any chain
  if (crossChainAssets.length > 0) {
    const asset = crossChainAssets[0];
    return {
      address: asset.assetId,
      chainId: asset.chainId as Hex | CaipChainId,
      decimals: asset.decimals,
      symbol: asset.symbol,
      name: asset.name,
      image: asset.image,
    };
  }
  // No eligible tokens found - return null to trigger on-ramp flow
  return null;
};

const toCurrentTokenAsBridgeToken = (token: TokenI): BridgeToken => ({
  ...token,
  address: token.address,
  chainId: token.chainId as Hex | CaipChainId,
  decimals: token.decimals,
  symbol: token.symbol,
  name: token.name,
  image: token.image,
  securityData: adaptTokenSecurityData(token.securityData),
  rwaData: token.rwaData,
});

const hasPositiveBalance = (balance: string | number | undefined): boolean => {
  if (typeof balance === 'number') {
    return balance > 0;
  }

  if (typeof balance === 'string') {
    const parsed = Number(balance.replace(/,/gu, '').trim());
    return Number.isFinite(parsed) && parsed > 0;
  }

  return false;
};

/**
 * Mounts a one-shot async lookup against the ramp provider vault so the
 * `is_authenticated` analytics property stays accurate without subscribing
 * to anything in the redux tree on every tick.
 *
 * Returns `false` until the lookup resolves, then flips to the resolved
 * value. Used by `useHandleOnBuy` to enrich the `RAMPS_BUTTON_CLICKED`
 * event payload.
 */
const useIsRampAuthenticated = (): boolean => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    let mounted = true;
    getProviderToken()
      .then((tokenResponse) => {
        if (!mounted) return;
        setIsAuthenticated(
          tokenResponse.success && Boolean(tokenResponse.token?.accessToken),
        );
      })
      .catch(() => {
        if (!mounted) return;
        setIsAuthenticated(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return isAuthenticated;
};

/**
 * Atomic hook returning the click handler for the Buy CTA on Token Details
 */
export const useHandleOnBuy = ({ token }: { token: TokenActionInput }) => {
  const store = useStore<RootState>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { goToBuy } = useRampNavigation();
  const rampUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const isAuthenticated = useIsRampAuthenticated();

  return useCallback(() => {
    const tokenChainIdHex = token.chainId as Hex;

    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.BUY,
      action_position: ActionPosition.FIRST_POSITION,
      button_label: strings('asset_overview.buy_button'),
      location: ActionLocation.ASSET_DETAILS,
    });

    let assetId: string | undefined;
    try {
      if (isCaipAssetType(token.address)) {
        assetId = token.address;
      } else {
        assetId = parseRampIntent({
          chainId: getDecimalChainId(tokenChainIdHex),
          address: token.address,
        })?.assetId;
      }
    } catch {
      assetId = undefined;
    }

    const state = store.getState();
    const rampGeodetectedRegion = getDetectedGeolocation(state);
    const orders = getOrders(state);
    const controllerOrders = selectRampsOrdersForSelectedAccountGroup(state);
    const rampRoutingDecision = getRampRoutingDecision(state);

    const completedOrders = [
      ...completedOrdersFromFiatOrders(orders),
      ...completedOrdersFromRampsOrders(controllerOrders),
    ];
    let preferredProvider: string | undefined;
    if (completedOrders.length > 0) {
      const [mostRecent] = [...completedOrders].sort(
        (a, b) => b.completedAt - a.completedAt,
      );
      preferredProvider = mostRecent.providerId;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          button_text: 'Buy',
          location: 'TokenDetails',
          chain_id_destination: getDecimalChainId(tokenChainIdHex),
          ramp_type: rampUnifiedV1Enabled ? 'UNIFIED_BUY' : 'BUY',
          region: rampGeodetectedRegion,
          ramp_routing: rampRoutingDecision ?? undefined,
          is_authenticated: isAuthenticated,
          preferred_provider: preferredProvider,
          order_count: orders.length + controllerOrders.length,
          asset_symbol: token.symbol,
        })
        .build(),
    );

    goToBuy({ assetId }, { buyFlowOrigin: 'tokenInfo' });
  }, [
    store,
    token,
    trackEvent,
    createEventBuilder,
    rampUnifiedV1Enabled,
    isAuthenticated,
    goToBuy,
  ]);
};

/**
 * Atomic hook returning the click handler for the Swap CTA on Token Details
 */
export const useHandleOnSwap = ({
  token,
  currentTokenBalance,
  sourcePage = 'MainView',
}: {
  token: TokenActionInput;
  /** Optional up-to-date token balance from Token Details balance hook */
  currentTokenBalance?: string;
  /** Page name sent with swap/bridge analytics. Defaults to `'MainView'`. */
  sourcePage?: string;
}) => {
  const store = useStore<RootState>();

  // When Token Details was opened from the bridge asset picker, skip updating
  // the location on the bridge controller to preserve the original entry-point
  // location from the session that opened the bridge (e.g. "Main View").
  const isFromBridgeAssetPicker = token.source === TokenDetailsSource.Swap;

  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage,
    transactionActiveAbTests: token.transactionActiveAbTests,
    skipLocationUpdate: isFromBridgeAssetPicker,
  });

  return useCallback(() => {
    if (!goToSwaps) return;

    const currentTokenAsBridgeToken = toCurrentTokenAsBridgeToken(token);
    const balanceForCheck = currentTokenBalance ?? token.balance;

    if (hasPositiveBalance(balanceForCheck)) {
      goToSwaps(currentTokenAsBridgeToken, undefined, undefined, true);
      return;
    }

    // Lazily compute the smart pick — only on press, only when needed.
    const userAssetsMap = selectAssetsBySelectedAccountGroup(store.getState());
    const buySourceToken = computeBuySourceToken(
      userAssetsMap,
      token.chainId,
      token.address,
    );

    if (buySourceToken) {
      goToSwaps(buySourceToken, currentTokenAsBridgeToken, undefined, true);
      return;
    }

    goToSwaps(currentTokenAsBridgeToken, undefined, undefined, true);
  }, [goToSwaps, store, token, currentTokenBalance]);
};

/**
 * Atomic hook returning the click handler for the Send CTA on Token Details.
 *
 * Switches to the token's chain (when needed) and routes through the
 * non-EVM send flow first; falls through to the EVM send page otherwise.
 */
export const useHandleOnSend = ({ token }: { token: TokenActionInput }) => {
  const navigation = useNavigation();
  const store = useStore<RootState>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { navigateToSendPage } = useSendNavigation();

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const { sendNonEvmAsset } = useSendNonEvmAsset({ asset: token });
  ///: END:ONLY_INCLUDE_IF

  return useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ACTION_BUTTON_CLICKED)
        .addProperties({
          action_name: ActionButtonType.SEND,
          action_position: ActionPosition.THIRD_POSITION,
          button_label: strings('asset_overview.send_button'),
          location: ActionLocation.ASSET_DETAILS,
        })
        .build(),
    );

    const wasHandledAsNonEvm = await sendNonEvmAsset(
      InitSendLocation.AssetOverview,
    );
    if (wasHandledAsNonEvm) {
      return;
    }

    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });

    const selectedChainId = selectEvmChainId(store.getState());

    if (token.chainId !== selectedChainId) {
      const { NetworkController, MultichainNetworkController } = Engine.context;
      const networkConfiguration =
        NetworkController.getNetworkConfigurationByChainId(
          token.chainId as Hex,
        );

      const networkClientId =
        networkConfiguration?.rpcEndpoints?.[
          networkConfiguration.defaultRpcEndpointIndex
        ]?.networkClientId;

      await MultichainNetworkController.setActiveNetwork(
        networkClientId as string,
      );
    }

    navigateToSendPage({
      location: InitSendLocation.AssetOverview,
      asset: token,
    });
  }, [
    trackEvent,
    createEventBuilder,
    sendNonEvmAsset,
    navigation,
    store,
    navigateToSendPage,
    token,
  ]);
};

/**
 * Atomic hook returning the click handler for the Receive CTA on Token Details.
 */
export const useHandleOnReceive = ({
  token,
  networkName,
}: {
  token: TokenActionInput;
  /** Optional network name displayed in the share-address QR sheet. */
  networkName?: string;
}) => {
  const navigation = useNavigation();
  const store = useStore<RootState>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  return useCallback(() => {
    const chainId = token.chainId as Hex;

    trackActionButtonClick(trackEvent, createEventBuilder, {
      action_name: ActionButtonType.RECEIVE,
      action_position: ActionPosition.FOURTH_POSITION,
      button_label: strings('asset_overview.receive_button'),
      location: ActionLocation.ASSET_DETAILS,
    });

    const state = store.getState();
    const selectedInternalAccount = selectSelectedInternalAccount(state);
    const selectedAccountGroup = selectSelectedAccountGroup(state);
    const getAccountByScope = selectSelectedInternalAccountByScope(state);

    const accountForChain = token.chainId
      ? (getAccountByScope(
          formatChainIdToCaip(token.chainId as Hex) as CaipChainId,
        ) ?? selectedInternalAccount)
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
      const resultChainId = formatChainIdToCaip(token.chainId as Hex);
      const isNonEvmToken = resultChainId === token.chainId;

      Logger.error(
        new Error('useHandleOnReceive - Missing required data for navigation'),
        {
          hasAddress: !!addressForChain,
          hasAccountGroup: !!selectedAccountGroup,
          hasChainId: !!chainId,
          isNonEvmAsset: isNonEvmToken,
          assetChainId: token.chainId,
        },
      );
    }
  }, [trackEvent, createEventBuilder, store, navigation, token, networkName]);
};
