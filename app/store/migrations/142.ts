import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import {
  BlockExplorerUrl,
  BuiltInNetworkName,
  ChainId,
  NetworkNickname,
  NetworkType,
  NetworksTicker,
} from '@metamask/controller-utils';
import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';

/**
 * Migration 142:
 *
 * Add Monad to NetworkController state.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 142;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (
    !hasProperty(state.engine.backgroundState, 'NetworkController') ||
    !isObject(state.engine.backgroundState.NetworkController)
  ) {
    return state;
  }

  const { NetworkController } = state.engine.backgroundState;

  if (
    !hasProperty(NetworkController, 'networkConfigurationsByChainId') ||
    !isObject(NetworkController.networkConfigurationsByChainId)
  ) {
    return state;
  }

  if (
    NetworkController.networkConfigurationsByChainId[
      ChainId[BuiltInNetworkName.MonadMainnet]
    ]
  ) {
    return state;
  }

  const quickNodeUrl = process.env.QUICKNODE_MONAD_URL;

  const monadMainnetConfig: NetworkConfiguration = {
    name: NetworkNickname[BuiltInNetworkName.MonadMainnet],
    chainId: ChainId[BuiltInNetworkName.MonadMainnet],
    blockExplorerUrls: [BlockExplorerUrl[BuiltInNetworkName.MonadMainnet]],
    defaultBlockExplorerUrlIndex: 0,
    rpcEndpoints: [
      {
        type: RpcEndpointType.Infura,
        url: `https://monad-mainnet.infura.io/v3/{infuraProjectId}`,
        networkClientId: NetworkType[BuiltInNetworkName.MonadMainnet],
        ...(quickNodeUrl ? { failoverUrls: [quickNodeUrl] } : {}),
      },
    ],
    defaultRpcEndpointIndex: 0,
    nativeCurrency: NetworksTicker[BuiltInNetworkName.MonadMainnet],
  };

  NetworkController.networkConfigurationsByChainId[
    ChainId[BuiltInNetworkName.MonadMainnet]
  ] = monadMainnetConfig;

  return state;
};

export default migration;
