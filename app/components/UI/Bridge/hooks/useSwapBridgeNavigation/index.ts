import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex, CaipChainId } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../../selectors/networkController';
import { BridgeToken, BridgeViewMode } from '../../types';
import {
  formatChainIdToHex,
  getNativeAssetForChainId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { BridgeRouteParams } from '../../Views/BridgeView';
import { EthScope } from '@metamask/keyring-api';
import { ethers } from 'ethers';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { useAddNetwork } from '../../../../hooks/useAddNetwork';
import { selectIsBridgeEnabledSource } from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { trace, TraceName } from '../../../../../util/trace';
import { useCurrentNetworkInfo } from '../../../../hooks/useCurrentNetworkInfo';

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
 * @returns An object containing functions that can be used to navigate to the existing Bridges page in the browser and the MetaMask Swaps page. If there isn't an existing bridge page, one is created based on the current chain ID and passed token address (if provided).
 */
export const useSwapBridgeNavigation = ({
  location,
  sourcePage,
  sourceToken: tokenBase,
}: {
  location: SwapBridgeNavigationLocation;
  sourcePage: string;
  sourceToken?: BridgeToken;
}) => {
  const navigation = useNavigation();
  const selectedChainId = useSelector(selectChainId);
  const { trackEvent, createEventBuilder } = useMetrics();
  const isBridgeEnabledSource = useSelector((state: RootState) =>
    selectIsBridgeEnabledSource(state, selectedChainId),
  );
  const currentNetworkInfo = useCurrentNetworkInfo();

  // Unified swaps/bridge UI
  const goToNativeBridge = useCallback(
    (bridgeViewMode: BridgeViewMode) => {
      // Determine effective chain ID - use home page filter network when no sourceToken provided
      const getEffectiveChainId = (): CaipChainId | Hex => {
        if (tokenBase) {
          // If specific token provided, use its chainId
          return tokenBase.chainId;
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

      const effectiveChainId = getEffectiveChainId();

      let bridgeSourceNativeAsset;
      try {
        if (!tokenBase) {
          bridgeSourceNativeAsset = getNativeAssetForChainId(effectiveChainId);
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
              chainId: isNonEvmChainId(effectiveChainId)
                ? effectiveChainId
                : formatChainIdToHex(effectiveChainId), // Use hex format for balance fetching compatibility, unless it's a Solana chain
            }
          : undefined;

      const candidateSourceToken =
        tokenBase ?? bridgeNativeSourceTokenFormatted;
      let sourceToken = isBridgeEnabledSource
        ? candidateSourceToken
        : undefined;

      if (!sourceToken) {
        // fallback to ETH on mainnet
        sourceToken = {
          address: ethers.constants.AddressZero,
          chainId: EthScope.Mainnet,
          symbol: 'ETH',
          decimals: 18,
        };
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

      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWAP_BUTTON_CLICKED)
          .addProperties({
            location,
            chain_id_source: getDecimalChainId(sourceToken.chainId),
            token_symbol_source: sourceToken?.symbol,
            token_address_source: sourceToken?.address,
          })
          .build(),
      );
      trace({
        name: TraceName.SwapViewLoaded,
        startTime: Date.now(),
      });
    },
    [
      navigation,
      tokenBase,
      sourcePage,
      trackEvent,
      createEventBuilder,
      location,
      isBridgeEnabledSource,
      currentNetworkInfo,
    ],
  );
  const { networkModal } = useAddNetwork();

  const goToSwaps = useCallback(() => {
    goToNativeBridge(BridgeViewMode.Unified);
  }, [goToNativeBridge]);

  return {
    goToSwaps,
    networkModal,
  };
};
