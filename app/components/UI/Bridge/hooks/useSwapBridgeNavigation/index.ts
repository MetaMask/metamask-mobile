import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import useGoToPortfolioBridge from '../useGoToPortfolioBridge';
import { isBridgeUiEnabled } from '../../utils';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../../selectors/networkController';
import { BridgeToken, BridgeViewMode } from '../../types';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';
import { BridgeRouteParams } from '../useInitialSourceToken';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SolScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF
import isBridgeAllowed from '../../utils/isBridgeAllowed';
import { ethers } from 'ethers';
import { isAssetFromSearch } from '../../../../../selectors/tokenSearchDiscoveryDataController';
import { PopularList } from '../../../../../util/networks/customNetworks';
import { useAddNetwork } from '../../../../hooks/useAddNetwork';
import { swapsUtils } from '@metamask/swaps-controller';

export enum SwapBridgeNavigationLocation {
  TabBar = 'TabBar',
  TokenDetails = 'TokenDetails',
}

/**
 * Returns functions that are used to navigate to the MetaMask Bridge and MetaMask Swaps routes.
 * @param location location of navigation call – used for analytics.
 * @param token token object containing address and chainId.
 * @returns An object containing functions that can be used to navigate to the existing Bridges page in the browser and the MetaMask Swaps page. If there isn't an existing bridge page, one is created based on the current chain ID and passed token address (if provided).
 */
export const useSwapBridgeNavigation = ({
  location,
  sourcePage,
  token: tokenBase,
}: {
  location: SwapBridgeNavigationLocation;
  sourcePage: string;
  token?: BridgeToken;
}) => {
  const navigation = useNavigation();
  const selectedChainId = useSelector(selectChainId);
  const goToPortfolioBridge = useGoToPortfolioBridge(location);

  // Bridge
  // title is consumed by getBridgeNavbar in app/components/UI/Navbar/index.js
  const goToNativeBridge = useCallback(
    (bridgeViewMode: BridgeViewMode) => {
      let bridgeSourceNativeAsset;
      try {
        if (!tokenBase) {
          bridgeSourceNativeAsset = getNativeAssetForChainId(selectedChainId);
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
              chainId: selectedChainId,
            }
          : undefined;

      const candidateBridgeToken =
        tokenBase ?? bridgeNativeSourceTokenFormatted;
      const bridgeToken = isBridgeAllowed(selectedChainId) ? candidateBridgeToken : undefined;

      if (!bridgeToken) {
        return;
      }
      navigation.navigate('Bridge', {
        screen: 'BridgeView',
        params: {
          token: bridgeToken,
          sourcePage,
          bridgeViewMode,
        } as BridgeRouteParams,
      });
    },
    [navigation, selectedChainId, tokenBase, sourcePage],
  );

  const goToBridge = useCallback(
    (bridgeViewMode: BridgeViewMode) => {
      if (isBridgeUiEnabled()) {
        goToNativeBridge(bridgeViewMode);
      } else {
        goToPortfolioBridge();
      }
    },
    [goToNativeBridge, goToPortfolioBridge],
  );

  const { addPopularNetwork, networkModal } = useAddNetwork();

  // Swaps
  const handleSwapsNavigation = useCallback(async (currentToken?: BridgeToken) => {
    const swapToken = currentToken ?? tokenBase ?? {
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
      const { NetworkController, MultichainNetworkController } = Engine.context;
      let networkConfiguration =
        NetworkController.getNetworkConfigurationByChainId(
          swapToken?.chainId as Hex,
        );

      if (!networkConfiguration && isAssetFromSearch(swapToken)) {
        const network = PopularList.find((popularNetwork) => popularNetwork.chainId === swapToken.chainId);
        if (network) {
          await addPopularNetwork(network);
          networkConfiguration = NetworkController.getNetworkConfigurationByChainId(
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
  }, [navigation, tokenBase, selectedChainId, sourcePage, addPopularNetwork]);

  const goToSwaps = useCallback(async (currentToken?: BridgeToken) => {
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    if (
      tokenBase?.chainId === SolScope.Mainnet ||
      selectedChainId === SolScope.Mainnet
    ) {
      goToBridge(BridgeViewMode.Swap);
      return;
    }
    ///: END:ONLY_INCLUDE_IF

    await handleSwapsNavigation(currentToken);
  }, [
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    tokenBase?.chainId,
    selectedChainId,
    goToBridge,
    ///: END:ONLY_INCLUDE_IF
    handleSwapsNavigation,
  ]);

  return {
    goToBridge: () => goToBridge(BridgeViewMode.Bridge),
    goToSwaps,
    networkModal,
  };
};
