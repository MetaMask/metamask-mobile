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
  location: string;
  sourcePage: string;
  token?: BridgeToken;
}) => {
  const navigation = useNavigation();
  const selectedChainId = useSelector(selectChainId);
  const goToPortfolioBridge = useGoToPortfolioBridge(location);

  const nativeSourceToken = getNativeAssetForChainId(
    tokenBase?.chainId ?? selectedChainId,
  );
  const nativeSourceTokenFormatted: BridgeToken = {
    address: nativeSourceToken.address,
    name: nativeSourceToken.name ?? '',
    symbol: nativeSourceToken.symbol,
    image: nativeSourceToken.iconUrl ?? '',
    decimals: nativeSourceToken.decimals,
    chainId: selectedChainId,
  };

  const token = tokenBase ?? nativeSourceTokenFormatted;

  // Bridge
  // title is consumed by getBridgeNavbar in app/components/UI/Navbar/index.js
  const goToNativeBridge = useCallback(
    (bridgeViewMode: BridgeViewMode) => {
      navigation.navigate('Bridge', {
        screen: 'BridgeView',
        params: {
          token,
          sourcePage,
          bridgeViewMode,
        } as BridgeRouteParams,
      });
    },
    [navigation, token, sourcePage],
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

  // Swaps
  const handleSwapsNavigation = useCallback(async () => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
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

    navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: token.address,
        chainId: token.chainId,
        sourcePage,
      },
    });
  }, [navigation, token, selectedChainId, sourcePage]);

  const goToSwaps = useCallback(() => {
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    if (
      token?.chainId === SolScope.Mainnet ||
      selectedChainId === SolScope.Mainnet
    ) {
      goToBridge(BridgeViewMode.Swap);
      return;
    }
    ///: END:ONLY_INCLUDE_IF

    handleSwapsNavigation();
  }, [
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    token?.chainId,
    selectedChainId,
    goToBridge,
    ///: END:ONLY_INCLUDE_IF
    handleSwapsNavigation,
  ]);

  return {
    goToBridge: () => goToBridge(BridgeViewMode.Bridge),
    goToSwaps,
  };
};
