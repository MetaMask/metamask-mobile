import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import useGoToPortfolioBridge from '../useGoToPortfolioBridge';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex, CaipChainId } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../../selectors/networkController';
import { BridgeToken, BridgeViewMode } from '../../types';
import {
  formatChainIdToHex,
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { BridgeRouteParams } from '../../Views/BridgeView';
import { SolScope, EthScope } from '@metamask/keyring-api';
import { ethers } from 'ethers';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { isAssetFromSearch } from '../../../../../selectors/tokenSearchDiscoveryDataController';
import { PopularList } from '../../../../../util/networks/customNetworks';
import { useAddNetwork } from '../../../../hooks/useAddNetwork';
import { swapsUtils } from '@metamask/swaps-controller';
import {
  selectIsBridgeEnabledSource,
  selectIsUnifiedSwapsEnabled,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { trace, TraceName } from '../../../../../util/trace';
import { useCurrentNetworkInfo } from '../../../../hooks/useCurrentNetworkInfo';

export enum SwapBridgeNavigationLocation {
  TabBar = 'TabBar',
  TokenDetails = 'TokenDetails',
  Swaps = 'Swaps',
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
  const goToPortfolioBridge = useGoToPortfolioBridge(location);
  const { trackEvent, createEventBuilder } = useMetrics();
  const isBridgeEnabledSource = useSelector((state: RootState) =>
    selectIsBridgeEnabledSource(state, selectedChainId),
  );
  const isUnifiedSwapsEnabled = useSelector(selectIsUnifiedSwapsEnabled);
  const currentNetworkInfo = useCurrentNetworkInfo();

  // Bridge
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
              chainId: isSolanaChainId(effectiveChainId)
                ? effectiveChainId
                : formatChainIdToHex(effectiveChainId), // Use hex format for balance fetching compatibility, unless it's a Solana chain
            }
          : undefined;

      const candidateSourceToken =
        tokenBase ?? bridgeNativeSourceTokenFormatted;
      const sourceToken = isBridgeEnabledSource
        ? candidateSourceToken
        : undefined;

      if (!sourceToken) {
        return;
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

  const goToBridge = useCallback(
    (bridgeViewMode: BridgeViewMode) => {
      if (isBridgeEnabledSource) {
        goToNativeBridge(bridgeViewMode);
      } else {
        goToPortfolioBridge();
      }
    },
    [goToNativeBridge, goToPortfolioBridge, isBridgeEnabledSource],
  );

  const { addPopularNetwork, networkModal } = useAddNetwork();

  // Swaps
  const handleLegacySwapsNavigation = useCallback(
    async (currentToken?: BridgeToken) => {
      const swapToken = currentToken ??
        tokenBase ?? {
          // For EVM chains, default swap token addr is zero address
          // Old Swap UI is EVM only, so we don't need to worry about Solana
          address: ethers.constants.AddressZero,
          chainId: selectedChainId,
        };

      if (!isAssetFromSearch(swapToken)) {
        navigation.navigate(Routes.WALLET.HOME, {
          screen: Routes.WALLET.TAB_STACK_FLOW,
          params: {
            screen: Routes.WALLET_VIEW,
          },
        });
      }

      if (swapToken?.chainId !== selectedChainId) {
        const { NetworkController, MultichainNetworkController } =
          Engine.context;
        let networkConfiguration =
          NetworkController.getNetworkConfigurationByChainId(
            swapToken?.chainId as Hex,
          );

        if (!networkConfiguration && isAssetFromSearch(swapToken)) {
          const network = PopularList.find(
            (popularNetwork) => popularNetwork.chainId === swapToken.chainId,
          );
          if (network) {
            await addPopularNetwork(network);
            networkConfiguration =
              NetworkController.getNetworkConfigurationByChainId(
                swapToken?.chainId as Hex,
              );
          }
        }
        const networkClientId =
          networkConfiguration?.rpcEndpoints?.[
            networkConfiguration.defaultRpcEndpointIndex
          ]?.networkClientId;

        await MultichainNetworkController.setActiveNetwork(
          networkClientId as string,
        );
      }

      // If the token was found by searching for it, it's more likely we want to swap into it than out of it
      if (isAssetFromSearch(swapToken)) {
        navigation.navigate(Routes.SWAPS, {
          screen: Routes.SWAPS_AMOUNT_VIEW,
          params: {
            sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
            destinationToken: swapToken?.address,
            chainId: swapToken?.chainId,
            sourcePage,
          },
        });
      } else {
        navigation.navigate(Routes.SWAPS, {
          screen: Routes.SWAPS_AMOUNT_VIEW,
          params: {
            sourceToken: swapToken?.address,
            chainId: swapToken?.chainId,
            sourcePage,
          },
        });
      }
    },
    [navigation, tokenBase, selectedChainId, sourcePage, addPopularNetwork],
  );

  const goToSwaps = useCallback(
    async (currentToken?: BridgeToken) => {
      if (isUnifiedSwapsEnabled) {
        goToBridge(BridgeViewMode.Unified);
        return;
      }

      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (
        tokenBase?.chainId === SolScope.Mainnet ||
        selectedChainId === SolScope.Mainnet
      ) {
        goToBridge(BridgeViewMode.Swap);
        return;
      }
      ///: END:ONLY_INCLUDE_IF

      await handleLegacySwapsNavigation(currentToken);
    },
    [
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      tokenBase?.chainId,
      selectedChainId,
      goToBridge,
      ///: END:ONLY_INCLUDE_IF
      handleLegacySwapsNavigation,
      isUnifiedSwapsEnabled,
    ],
  );

  return {
    goToBridge: () => goToBridge(BridgeViewMode.Bridge),
    goToSwaps,
    networkModal,
  };
};
