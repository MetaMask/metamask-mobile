import { toHex } from '@metamask/controller-utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import {
  POLYGON_MAINNET_CHAIN_ID,
  POLYGON_MAINNET_CAIP_CHAIN_ID,
} from '../providers/polymarket/constants';

/* eslint-disable @typescript-eslint/no-require-imports, import-x/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

/**
 * Ensures Polygon is configured for Predict reads (balance, positions, activity).
 * Adds the chain when it is missing and does not change the wallet network filter.
 */
export const usePredictNetworkManagement = () => {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  /**
   * Ensures the Polygon network exists.
   * Does not call NetworkEnablementController. Enabling Polygon from a read
   * would clear every other enabled network and persist that as the filter.
   * @returns Promise that resolves when the network is configured, or rejects
   * when adding it fails.
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
      // Add the network without selecting it in the wallet filter.
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

      throw error;
    }
  }, [networkConfigurations]);

  return {
    ensurePolygonNetworkExists,
  };
};
