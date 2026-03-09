import { toHex } from '@metamask/controller-utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import type { AccountState } from '../types';
import {
  POLYGON_MAINNET_CHAIN_ID,
  POLYGON_MAINNET_CAIP_CHAIN_ID,
} from '../providers/polymarket/constants';

const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

/**
 * Ensures the Polygon network exists before querying account state.
 * Runs inside queryFn so it executes sequentially before getAccountState.
 */
async function ensurePolygonNetwork(): Promise<void> {
  const chainId = toHex(POLYGON_MAINNET_CHAIN_ID);
  const { NetworkController } = Engine.context;

  if (NetworkController.state.networkConfigurationsByChainId[chainId]) {
    return;
  }

  try {
    await NetworkController.addNetwork({
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
    });

    Engine.context.NetworkEnablementController.enableNetwork(
      POLYGON_MAINNET_CAIP_CHAIN_ID,
    );
  } catch (error) {
    Logger.error(ensureError(error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'ensurePolygonNetwork',
      },
      context: {
        name: 'ensurePolygonNetwork',
        data: {
          method: 'ensurePolygonNetwork',
          action: 'add_polygon_network',
          operation: 'network_management',
          chainId,
          caipChainId: POLYGON_MAINNET_CAIP_CHAIN_ID,
        },
      },
    });

    // Still try to enable — network may already exist.
    Engine.context.NetworkEnablementController.enableNetwork(
      POLYGON_MAINNET_CAIP_CHAIN_ID,
    );
  }
}

export const predictAccountStateKeys = {
  all: () => ['predict', 'accountState'] as const,
};

export const predictAccountStateOptions = () =>
  queryOptions({
    queryKey: predictAccountStateKeys.all(),
    queryFn: async (): Promise<AccountState> => {
      await ensurePolygonNetwork();
      return Engine.context.PredictController.getAccountState({});
    },
    staleTime: 10_000,
  });
