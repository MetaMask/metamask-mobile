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

const InfuraKey = process.env.MM_INFURA_PROJECT_ID ?? '';
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

/**
 * Ensures Polygon is configured so Predict account-state reads can resolve a
 * network client. Adds the chain when it is missing.
 *
 * Does not update NetworkEnablementController. `enableNetwork` disables every
 * other network, so a call from this query would replace the wallet filter
 * (for example Ethereum) with Polygon on foreground refetch and cold start.
 * Account state, balance, and activity already read via the Polygon network
 * client id or the Polymarket API and do not need the chain enabled.
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
  }
}

export const predictAccountStateKeys = {
  all: () => ['predict', 'accountState'] as const,
};

export const predictAccountStateOptions = () =>
  queryOptions<AccountState, Error>({
    queryKey: predictAccountStateKeys.all(),
    queryFn: async (): Promise<AccountState> => {
      await ensurePolygonNetwork();
      return Engine.context.PredictController.getAccountState({});
    },
    staleTime: 10_000,
  });
