import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import useGoToPortfolioBridge from './useGoToPortfolioBridge';
import { isBridgeUiEnabled } from '../utils';
import Routes from '../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { swapsUtils } from '@metamask/swaps-controller';
import { useSelector } from 'react-redux';
import { selectEvmChainId } from '../../../../selectors/networkController';

/**
 * Returns functions that are used to navigate to the MetaMask Bridge and MetaMask Swaps routes.
 * @param location location of navigation call – used for analytics.
 * @param token token object containing address and chainId.
 * @returns An object containing functions that can be used to navigate to the existing Bridges page in the browser and the MetaMask Swaps page. If there isn't an existing bridge page, one is created based on the current chain ID and passed token address (if provided).
 */
export const useSwapBridgeNavigation = ({
  location,
  token,
}: {
  location: string;
  token: {
    address: string;
    chainId?: string;
  };
}) => {
  const navigation = useNavigation();
  const selectedChainId = useSelector(selectEvmChainId);
  const goToPortfolioBridge = useGoToPortfolioBridge(location);

  // Bridge
  const goToNativeBridge = useCallback(() => {
    navigation.navigate('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: token.address,
        chainId: token.chainId,
        sourcePage: 'MainView',
      },
    });
  }, [navigation, token.address, token.chainId]);

  const goToBridge = isBridgeUiEnabled()
    ? goToNativeBridge
    : goToPortfolioBridge;

  // Swaps
  const handleSwapNavigation = useCallback(() => {
    navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: token.address ?? swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
        sourcePage: 'MainView',
        chainId: token.chainId,
      },
    });
  }, [navigation, token.address, token.chainId]);

  const goToSwaps = useCallback(() => {
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
  }, [navigation, token.chainId, selectedChainId, handleSwapNavigation]);

  return {
    goToBridge,
    goToSwaps,
  };
};
