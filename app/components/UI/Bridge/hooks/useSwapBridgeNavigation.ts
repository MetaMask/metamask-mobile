import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import useGoToPortfolioBridge from './useGoToPortfolioBridge';
import { isBridgeUiEnabled } from '../utils';
import Routes from '../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { BridgeToken } from '../types';
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
  token,
}: {
  location: string;
  sourcePage: string;
  token?: BridgeToken;
}) => {
  const navigation = useNavigation();
  const selectedChainId = useSelector(selectEvmChainId);
  const goToPortfolioBridge = useGoToPortfolioBridge(location);

  // Bridge
  const goToNativeBridge = useCallback(() => {
    navigation.navigate('Bridge', {
      screen: 'BridgeView',
      params: {
        token,
        sourcePage,
      },
    });
  }, [navigation, token, sourcePage]);

  const goToBridge = isBridgeUiEnabled()
    ? goToNativeBridge
    : goToPortfolioBridge;

  // Swaps
  const handleSwapNavigation = useCallback(() => {
    if (!token) {
      return;
    }

    navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: token.address,
        chainId: token.chainId,
        sourcePage,
      },
    });
  }, [navigation, token, sourcePage]);

  const handleSwapsNavigation = useCallback(() => {
    if (!token) {
      return;
    }

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

      MultichainNetworkController.setActiveNetwork(
        networkClientId as string,
      ).then(() => {
        handleSwapNavigation();
      });
    } else {
      handleSwapNavigation();
    }
  }, [navigation, token, selectedChainId, handleSwapNavigation]);

  const goToSwaps = useCallback(() => {
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    if (token?.chainId === SolScope.Mainnet) {
      goToBridge();
      return;
    }
    ///: END:ONLY_INCLUDE_IF

    handleSwapsNavigation();
  }, [
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    token?.chainId,
    goToBridge,
    ///: END:ONLY_INCLUDE_IF
    handleSwapsNavigation,
  ]);

  return {
    goToBridge,
    goToSwaps,
  };
};
