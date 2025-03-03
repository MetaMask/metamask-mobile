import { Hex } from '@metamask/utils';
import { createSelector } from 'reselect';
import { InfuraNetworkType } from '@metamask/controller-utils';
import {
  BuiltInNetworkClientId,
  CustomNetworkClientId,
  NetworkConfiguration,
  NetworkState,
  RpcEndpointType,
} from '@metamask/network-controller';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { NETWORKS_CHAIN_ID } from '../constants/network';
import { selectTokenNetworkFilter } from './preferencesController';
import { enableAllNetworksFilter } from '../components/UI/Tokens/util/enableAllNetworksFilter';
import { PopularList } from '../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  selectNonEvmNetworkConfigurationsByChainId,
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkSymbol,
} from './multichainNetworkController';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';

interface InfuraRpcEndpoint {
  name?: string;
  networkClientId: BuiltInNetworkClientId;
  type: RpcEndpointType.Infura;
  url: `https://${InfuraNetworkType}.infura.io/v3/{infuraProjectId}`;
}
/**
 * A custom RPC endpoint is a reference to a user-defined server which fronts an
 * EVM chain. It may refer to an Infura network, but only by coincidence.
 */
interface CustomRpcEndpoint {
  name?: string;
  networkClientId: CustomNetworkClientId;
  type: RpcEndpointType.Custom;
  url: string;
}

type RpcEndpoint = InfuraRpcEndpoint | CustomRpcEndpoint;

export interface ProviderConfig {
  id?: string;
  nickname?: string;
  rpcUrl?: string;
  chainId: `0x${string}`;
  ticker: string;
  rpcPrefs: { blockExplorerUrl?: string };
  type: string;
}

// Helper function to return the default provider config (mainnet)
const getDefaultProviderConfig = (): ProviderConfig => ({
  chainId: NETWORKS_CHAIN_ID.MAINNET,
  ticker: 'ETH',
  rpcPrefs: {},
  type: RpcEndpointType.Infura,
});

const getProviderType = (rpcEndpoint: RpcEndpoint): string =>
  rpcEndpoint.type === RpcEndpointType.Custom
    ? 'rpc'
    : rpcEndpoint.networkClientId;

// Helper function to create the provider config based on the network and endpoint
export const createProviderConfig = (
  networkConfig: NetworkConfiguration,
  rpcEndpoint: RpcEndpoint,
): ProviderConfig => {
  const {
    chainId,
    nativeCurrency,
    name,
    blockExplorerUrls,
    defaultBlockExplorerUrlIndex,
  } = networkConfig;
  const blockExplorerIndex = defaultBlockExplorerUrlIndex ?? 0;
  const blockExplorerUrl = blockExplorerUrls?.[blockExplorerIndex];

  return {
    chainId,
    ticker: nativeCurrency,
    rpcPrefs: { ...(blockExplorerUrl && { blockExplorerUrl }) },
    type: getProviderType(rpcEndpoint),
    ...(rpcEndpoint.type === RpcEndpointType.Custom && {
      id: rpcEndpoint.networkClientId,
      nickname: name,
      rpcUrl: rpcEndpoint.url,
    }),
  };
};

export const selectNetworkControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NetworkController;

export const selectSelectedNetworkClientId = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState.selectedNetworkClientId,
);

export const selectProviderConfig = createDeepEqualSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState): ProviderConfig => {
    const selectedNetworkClientId =
      networkControllerState?.selectedNetworkClientId;
    const networkConfigurationsByChainId =
      networkControllerState?.networkConfigurationsByChainId ?? {};

    if (!networkConfigurationsByChainId || !selectedNetworkClientId) {
      return getDefaultProviderConfig();
    }

    for (const networkConfig of Object.values(networkConfigurationsByChainId)) {
      const matchingRpcEndpoint = networkConfig.rpcEndpoints.find(
        (endpoint) => endpoint.networkClientId === selectedNetworkClientId,
      );

      if (matchingRpcEndpoint) {
        return createProviderConfig(networkConfig, matchingRpcEndpoint);
      }
    }

    // Return default provider config (mainnet) if no matching network is found
    return getDefaultProviderConfig();
  },
);

export const selectEvmTicker = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig?.ticker,
);

export const selectTicker = createSelector(
  selectEvmTicker,
  selectSelectedNonEvmNetworkSymbol,
  selectIsEvmNetworkSelected,
  (evmTicker, nonEvmTicker, isEvmSelected) =>
    isEvmSelected ? evmTicker : nonEvmTicker,
);

export const selectEvmChainId = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig.chainId,
);

export const selectChainId = createSelector(
  selectSelectedNonEvmNetworkChainId,
  selectEvmChainId,
  selectIsEvmNetworkSelected,
  (selectedNonEvmChainId, selectedEvmChainId: Hex, isEvmSelected: boolean) =>
    !isEvmSelected ? selectedNonEvmChainId : selectedEvmChainId,
);

export const selectProviderType = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig.type,
);
export const selectNickname = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig.nickname,
);
export const selectRpcUrl = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig.rpcUrl,
);

export const selectNetworkStatus = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState?.networksMetadata[
      networkControllerState.selectedNetworkClientId
    ].status,
);

export const selectEvmNetworkConfigurationsByChainId = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState?.networkConfigurationsByChainId,
);

export const selectNetworkConfigurations = createSelector(
  selectEvmNetworkConfigurationsByChainId,
  selectNonEvmNetworkConfigurationsByChainId,
  (
    evmNetworkConfigurationsByChainId,
    nonEvmNetworkConfigurationsByChainId,
  ): Record<string, MultichainNetworkConfiguration> => {
    const networkConfigurationsByChainId = {
      ...evmNetworkConfigurationsByChainId,
      ...nonEvmNetworkConfigurationsByChainId,
    };
    return networkConfigurationsByChainId;
  },
);

export const selectNetworkClientId = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState.selectedNetworkClientId,
);

export const selectIsEIP1559Network = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState?.networksMetadata?.[
      networkControllerState.selectedNetworkClientId
    ].EIPS[1559] === true,
);

// Selector to get the popular network configurations, this filter also testnet networks
export const selectAllPopularNetworkConfigurations = createSelector(
  selectEvmNetworkConfigurationsByChainId,
  (networkConfigurations) => {
    const popularNetworksChainIds = PopularList.map(
      (popular) => popular.chainId,
    );

    return Object.keys(networkConfigurations)
      .filter(
        (chainId) =>
          popularNetworksChainIds.includes(chainId as Hex) ||
          chainId === CHAIN_IDS.MAINNET ||
          chainId === CHAIN_IDS.LINEA_MAINNET,
      )
      .reduce<Record<string, NetworkConfiguration>>((acc, chainId) => {
        acc[chainId] = networkConfigurations[chainId as Hex];
        return acc;
      }, {});
  },
);

export const selectIsPopularNetwork = createSelector(
  selectChainId,
  (chainId) =>
    chainId === CHAIN_IDS.MAINNET ||
    chainId === CHAIN_IDS.LINEA_MAINNET ||
    PopularList.some((network) => network.chainId === chainId),
);

export const selectIsAllNetworks = createSelector(
  selectAllPopularNetworkConfigurations,
  (state: RootState) => selectTokenNetworkFilter(state),
  (popularNetworkConfigurations, tokenNetworkFilter) => {
    if (Object.keys(tokenNetworkFilter).length === 1) {
      return false;
    }
    const allNetworks = enableAllNetworksFilter(popularNetworkConfigurations);
    return (
      Object.keys(tokenNetworkFilter).length === Object.keys(allNetworks).length
    );
  },
);

export const selectNetworkConfigurationByChainId = createSelector(
  [selectNetworkConfigurations, (_state: RootState, chainId) => chainId],
  (networkConfigurations, chainId) => networkConfigurations?.[chainId] || null,
);

export const selectNativeCurrencyByChainId = createSelector(
  [
    selectEvmNetworkConfigurationsByChainId,
    (_state: RootState, chainId) => chainId,
  ],
  (networkConfigurations, chainId) =>
    networkConfigurations?.[chainId]?.nativeCurrency,
);

export const selectDefaultEndpointByChainId = createSelector(
  selectEvmNetworkConfigurationsByChainId,
  (_: RootState, chainId: Hex) => chainId,
  (networkConfigurations, chainId) => {
    const networkConfiguration = networkConfigurations[chainId];
    return networkConfiguration?.rpcEndpoints?.[
      networkConfiguration.defaultRpcEndpointIndex
    ];
  },
);

export const selectProviderTypeByChainId = createSelector(
  selectDefaultEndpointByChainId,
  (defaultEndpoint) =>
    defaultEndpoint ? getProviderType(defaultEndpoint) : undefined,
);

export const selectRpcUrlByChainId = createSelector(
  selectDefaultEndpointByChainId,
  (defaultEndpoint) => defaultEndpoint?.url,
);

export const checkNetworkAndAccountSupports1559 = createSelector(
  selectNetworkControllerState,
  (_state: RootState, networkClientId: string) => networkClientId,
  (networkControllerState: NetworkState, networkClientId: string) => {
    const selectedNetworkClientId =
      networkControllerState.selectedNetworkClientId;

    return (
      networkControllerState.networksMetadata?.[
        networkClientId ?? selectedNetworkClientId
      ]?.EIPS[1559] === true
    );
  },
);
