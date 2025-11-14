import { toHex } from '@metamask/controller-utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import {
  POLYGON_MAINNET_CHAIN_ID,
  POLYGON_MAINNET_CAIP_CHAIN_ID,
} from '../providers/polymarket/constants';

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

/**
 * Hook for managing Polygon network for predict trading
 * Handles network existence check and automatic addition if needed
 */
export const usePredictNetworkManagement = () => {
  const { enableNetwork } = useNetworkEnablement();
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  /**
   * Ensures the Polygon network exists and is enabled
   * @returns Promise that resolves when network is ready
   */
  const ensurePolygonNetworkExists = useCallback(async () => {
    const chainId = toHex(POLYGON_MAINNET_CHAIN_ID);

    // Check if network already exists
    if (networkConfigurations[chainId]) {
      return;
    }

    // Network doesn't exist, add it
    const { NetworkController } = Engine.context;

    try {
      // Add the network
      await Promise.resolve(
        NetworkController.addNetwork({
          chainId,
          blockExplorerUrls: ['https://polygonscan.com'],
          defaultRpcEndpointIndex: 0,
          defaultBlockExplorerUrlIndex: 0,
          name: 'Polygon',
          nativeCurrency: 'POL',
          rpcEndpoints: [
            {
              url: `https://polygon-mainnet.infura.io/v3/${infuraProjectId}`,
              name: 'Polygon',
              type: RpcEndpointType.Custom,
            },
          ],
        }),
      );

      // Enable the newly added network
      enableNetwork(POLYGON_MAINNET_CAIP_CHAIN_ID);
    } catch (error) {
      // Log to Sentry but don't show user-facing error
      Logger.error(ensureError(error), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictNetworkManagement',
        },
        context: {
          name: 'usePredictNetworkManagement',
          data: {
            method: 'ensurePolygonMainnet',
            action: 'add_polygon_network',
            operation: 'network_management',
            chainId,
            caipChainId: POLYGON_MAINNET_CAIP_CHAIN_ID,
          },
        },
      });

      // Still try to enable the network (it might already exist)
      enableNetwork(POLYGON_MAINNET_CAIP_CHAIN_ID);
      throw error;
    }
  }, [networkConfigurations, enableNetwork]);

  return {
    ensurePolygonNetworkExists,
  };
};
