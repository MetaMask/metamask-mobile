import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex, CaipChainId } from '@metamask/utils';
import { useSelector, useDispatch } from 'react-redux';
import { BridgeToken, BridgeViewMode } from '../../types';
import {
  formatChainIdToHex,
  getNativeAssetForChainId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { BridgeRouteParams } from '../../Views/BridgeView';
import { EthScope } from '@metamask/keyring-api';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import {
  trackActionButtonClick,
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../../../util/analytics/actionButtonTracking';
import { useAddNetwork } from '../../../../hooks/useAddNetwork';
import {
  selectIsBridgeEnabledSourceFactory,
  setSourceToken,
  setDestToken,
  setIsDestTokenManuallySet,
} from '../../../../../core/redux/slices/bridge';
import { trace, TraceName } from '../../../../../util/trace';
import { useCurrentNetworkInfo } from '../../../../hooks/useCurrentNetworkInfo';
import { strings } from '../../../../../../locales/i18n';
import {
  getNativeSourceToken,
  getDefaultDestToken,
} from '../../utils/tokenUtils';
import { areAddressesEqual } from '../../../../../util/address';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';

export enum SwapBridgeNavigationLocation {
  TabBar = 'TabBar',
  TokenDetails = 'TokenDetails',
  Swaps = 'Swaps',
  Rewards = 'Rewards',
}

/**
 * Returns functions that are used to navigate to the MetaMask Bridge and MetaMask Swaps routes.
 * @param location location of navigation call – used for analytics.
 * @param sourceToken token object containing address and chainId we want to set as source.
 * @param destToken optional token object to set as destination. If not provided, or matches source, defaults to computed destination token.
 * @returns An object containing functions that can be used to navigate to the existing Bridges page in the browser and the MetaMask Swaps page. If there isn't an existing bridge page, one is created based on the current chain ID and passed token address (if provided).
 */
export const useSwapBridgeNavigation = ({
  location,
  sourcePage,
  sourceToken: sourceTokenBase,
  destToken: destTokenBase,
}: {
  location: SwapBridgeNavigationLocation;
  sourcePage: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const getIsBridgeEnabledSource = useSelector(
    selectIsBridgeEnabledSourceFactory,
  );
  const currentNetworkInfo = useCurrentNetworkInfo();

  // Unified swaps/bridge UI
  const goToNativeBridge = useCallback(
    (
      bridgeViewMode: BridgeViewMode,
      sourceTokenOverride?: BridgeToken,
      destTokenOverride?: BridgeToken,
    ) => {
      // Use tokenOverride if provided, otherwise fall back to tokenBase
      const effectiveSourceTokenBase = sourceTokenOverride ?? sourceTokenBase;
      // Use destTokenOverride if provided, otherwise fall back to destTokenBase
      const effectiveDestTokenBase = destTokenOverride ?? destTokenBase;

      // Determine effective chain ID - use home page filter network when no sourceToken provided
      const getEffectiveSourceChainId = (): CaipChainId | Hex => {
        if (effectiveSourceTokenBase) {
          // If specific token provided, use its chainId
          return effectiveSourceTokenBase.chainId;
        }

        // No token provided - check home page filter network
        const homePageFilterNetwork = currentNetworkInfo.getNetworkInfo(0);
        if (
          !homePageFilterNetwork?.caipChainId ||
          currentNetworkInfo.enabledNetworks.length > 1
        ) {
          // Fall back to mainnet if no filter or multiple networks
          return EthScope.Mainnet;
        }

        return homePageFilterNetwork.caipChainId as CaipChainId;
      };

      const effectiveSourceChainId = getEffectiveSourceChainId();

      let bridgeSourceNativeAsset;
      try {
        if (!effectiveSourceTokenBase) {
          bridgeSourceNativeAsset = getNativeAssetForChainId(
            effectiveSourceChainId,
          );
        }
      } catch (error) {
        // Suppress error as it's expected when the chain is not supported
      }

      const bridgeNativeSourceTokenFormatted: BridgeToken | undefined =
        bridgeSourceNativeAsset
          ? {
              address: bridgeSourceNativeAsset.address,
              name: bridgeSourceNativeAsset.name ?? '',
              symbol: bridgeSourceNativeAsset.symbol,
              image: bridgeSourceNativeAsset.iconUrl ?? '',
              decimals: bridgeSourceNativeAsset.decimals,
              chainId: isNonEvmChainId(effectiveSourceChainId)
                ? effectiveSourceChainId
                : formatChainIdToHex(effectiveSourceChainId), // Use hex format for balance fetching compatibility, unless it's a Solana chain
            }
          : undefined;

      const candidateSourceToken =
        effectiveSourceTokenBase ?? bridgeNativeSourceTokenFormatted;
      const isBridgeEnabledSource = getIsBridgeEnabledSource(
        effectiveSourceChainId,
      );
      let sourceToken = isBridgeEnabledSource
        ? candidateSourceToken
        : undefined;

      if (!sourceToken) {
        // fallback to ETH on mainnet
        sourceToken = getNativeSourceToken(EthScope.Mainnet);
      }

      // Reset the manual dest token flag on navigation so auto-update works correctly
      // This ensures if user previously manually set dest, then closed and reopened the app,
      // changing source token will still auto-update the dest token
      dispatch(setIsDestTokenManuallySet(false));

      // Pre-populate Redux state before navigation to prevent empty button flash
      dispatch(setSourceToken(sourceToken));

      // Use provided destToken if available and different from sourceToken, otherwise compute default
      if (
        effectiveDestTokenBase &&
        !areAddressesEqual(sourceToken.address, effectiveDestTokenBase.address)
      ) {
        dispatch(setDestToken(effectiveDestTokenBase));
      } else {
        // Either no destToken provided, or it's the same as sourceToken - use default logic
        const defaultDestToken = getDefaultDestToken(sourceToken.chainId);
        // Make sure source and dest tokens are different
        if (
          defaultDestToken &&
          !areAddressesEqual(sourceToken.address, defaultDestToken.address)
        ) {
          dispatch(setDestToken(defaultDestToken));
        } else {
          // Fall back to native token if default dest is same as source
          const nativeDestToken = getNativeSourceToken(sourceToken.chainId);
          if (
            !areAddressesEqual(sourceToken.address, nativeDestToken.address)
          ) {
            dispatch(setDestToken(nativeDestToken));
          }
        }
      }

      const params: BridgeRouteParams = {
        sourceToken,
        sourcePage,
        bridgeViewMode,
      };

      navigation.navigate(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BRIDGE_VIEW,
        params,
      });

      // Track Swap button click with new consolidated event
      const isFromNavbar = location === SwapBridgeNavigationLocation.TabBar;
      trackActionButtonClick(trackEvent, createEventBuilder, {
        action_name: ActionButtonType.SWAP,
        // Omit action_position for navbar to avoid confusion with main action buttons
        ...(isFromNavbar
          ? {}
          : { action_position: ActionPosition.SECOND_POSITION }),
        button_label: strings('asset_overview.swap'),
        location: isFromNavbar
          ? ActionLocation.NAVBAR
          : ActionLocation.ASSET_DETAILS,
      });
      // Check if user is in an active trending session for analytics
      const isFromTrending =
        TrendingFeedSessionManager.getInstance().isFromTrending;

      const swapEventProperties = {
        location,
        chain_id_source: getDecimalChainId(sourceToken.chainId),
        token_symbol_source: sourceToken?.symbol,
        token_address_source: sourceToken?.address,
        from_trending: isFromTrending,
      };

      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWAP_BUTTON_CLICKED)
          .addProperties(swapEventProperties)
          .build(),
      );
      trace({
        name: TraceName.SwapViewLoaded,
        startTime: Date.now(),
      });
    },
    [
      navigation,
      dispatch,
      sourceTokenBase,
      destTokenBase,
      sourcePage,
      trackEvent,
      createEventBuilder,
      location,
      currentNetworkInfo,
      getIsBridgeEnabledSource,
    ],
  );
  const { networkModal } = useAddNetwork();

  const goToSwaps = useCallback(
    (tokenOverride?: BridgeToken, destTokenOverride?: BridgeToken) => {
      goToNativeBridge(
        BridgeViewMode.Unified,
        tokenOverride,
        destTokenOverride,
      );
    },
    [goToNativeBridge],
  );

  return {
    goToSwaps,
    networkModal,
  };
};
