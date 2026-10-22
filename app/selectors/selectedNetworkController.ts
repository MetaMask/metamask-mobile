import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { SelectedNetworkControllerState } from '@metamask/selected-network-controller';
import { getNetworkImageSource, NetworkList } from '../util/networks';
import { strings } from '../../locales/i18n';
import {
  selectProviderConfig,
  selectSelectedNetworkClientId,
  selectEvmChainId as selectProviderChainId,
  selectRpcUrl as selectProviderRpcUrl,
  ProviderConfig,
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from './networkController';
import { NetworkConfiguration } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import { isNonEvmChainId } from '../core/Multichain/utils';

const selectSelectedNetworkControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.SelectedNetworkController;

export const selectNetworkClientIdsByDomains = createSelector(
  selectSelectedNetworkControllerState,
  (selectedNetworkControllerState: SelectedNetworkControllerState) =>
    selectedNetworkControllerState?.domains,
);

export const makeSelectDomainNetworkClientId = () =>
  createSelector(
    [
      selectNetworkClientIdsByDomains,
      (_: RootState, hostname?: string) => hostname,
    ],
    (networkClientIdsByDomains, hostname) =>
      hostname ? networkClientIdsByDomains?.[hostname] : undefined,
  );

/**
 * Network client for a dapp origin. Matches SelectedNetworkController's
 * `getNetworkClientIdForDomain`: the per-dapp `domains` entry, or the
 * globally selected network client when that origin has none.
 */
export const selectNetworkClientIdForDomain = createSelector(
  [
    selectNetworkClientIdsByDomains,
    selectSelectedNetworkClientId,
    (_: RootState, hostname?: string) => hostname,
  ],
  (domains, selectedNetworkClientId, hostname) =>
    (hostname ? domains?.[hostname] : undefined) ?? selectedNetworkClientId,
);

const selectProviderNetworkName = createSelector(
  [
    selectProviderConfig,
    selectEvmNetworkConfigurationsByChainId,
    selectSelectedNetworkClientId,
    selectEvmChainId,
  ],
  (
    providerConfig: ProviderConfig,
    networkConfigurations,
    selectedNetworkClientId,
    chainId,
  ) => {
    if (isNonEvmChainId(chainId)) {
      return networkConfigurations[chainId]?.name;
    }

    if (providerConfig.type === 'rpc') {
      return networkConfigurations[chainId]?.rpcEndpoints.find(
        ({ networkClientId }) => networkClientId === selectedNetworkClientId,
      )?.name;
    }
    let name;
    if (providerConfig.nickname) {
      name = providerConfig.nickname;
    } else {
      const networkType = providerConfig.type;
      name =
        // @ts-expect-error The utils/network file is still JS
        NetworkList?.[networkType]?.name ||
        NetworkList.rpc.name ||
        strings('network_information.unknown_network');
    }
    return name;
  },
);

const selectProviderNetworkImageSource = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) =>
    getNetworkImageSource({
      networkType: providerConfig.type,
      chainId: providerConfig.chainId,
    }),
);

const selectChainIdToUse = createSelector(
  [selectEvmNetworkConfigurationsByChainId, selectNetworkClientIdForDomain],
  (networkConfigurations, networkClientIdForDomain) => {
    let chainIdToUse;

    for (const networkConfig of Object.values(
      networkConfigurations as unknown as Record<Hex, NetworkConfiguration>,
    )) {
      const matchingRpcEndpoint = networkConfig.rpcEndpoints.find(
        (endpoint) => endpoint.networkClientId === networkClientIdForDomain,
      );

      if (matchingRpcEndpoint) {
        chainIdToUse = networkConfig.chainId;
      }
    }

    return chainIdToUse;
  },
);

export const makeSelectNetworkName = () =>
  createSelector(
    [
      selectEvmNetworkConfigurationsByChainId,
      selectProviderNetworkName,
      selectNetworkClientIdForDomain,
      selectEvmChainId,
      (_: RootState, hostname?: string) => hostname,
      selectChainIdToUse,
    ],
    (
      networkConfigurations,
      providerNetworkName,
      networkClientIdForDomain,
      chainId,
      hostname,
      chainIdToUse,
    ) => {
      if (!hostname) return providerNetworkName;

      const relevantChainId = chainIdToUse || chainId;

      return (
        networkConfigurations[relevantChainId]?.rpcEndpoints.find(
          ({ networkClientId }: { networkClientId: string }) =>
            networkClientId === networkClientIdForDomain,
        )?.name ||
        // @ts-expect-error The utils/network file is still JS
        NetworkList[networkClientIdForDomain]?.name
      );
    },
  );

export const makeSelectNetworkImageSource = () =>
  createSelector(
    [
      selectEvmNetworkConfigurationsByChainId,
      selectProviderNetworkImageSource,
      selectNetworkClientIdForDomain,
      selectEvmChainId,
      (_: RootState, hostname?: string) => hostname,
      selectChainIdToUse,
    ],
    (
      networkConfigurations,
      providerNetworkImageSource,
      networkClientIdForDomain,
      chainId,
      hostname,
      chainIdToUse,
    ) => {
      if (!hostname) return providerNetworkImageSource;

      const relevantChainId = chainIdToUse || chainId;

      const networkConfig = networkConfigurations[relevantChainId];
      if (networkConfig) {
        return getNetworkImageSource({ chainId: networkConfig.chainId });
      }
      return getNetworkImageSource({
        // @ts-expect-error The utils/network file is still JS
        networkType: NetworkList[networkClientIdForDomain]?.networkType,
        // @ts-expect-error The utils/network file is still JS
        chainId: NetworkList[networkClientIdForDomain]?.chainId,
      });
    },
  );

export const makeSelectChainId = () =>
  createSelector(
    [
      selectProviderChainId,
      selectNetworkClientIdForDomain,
      selectEvmChainId,
      (_: RootState, hostname?: string) => hostname,
      selectChainIdToUse,
    ],
    (
      providerChainId,
      networkClientIdForDomain,
      chainId,
      hostname,
      chainIdToUse,
    ) => {
      if (!hostname) {
        return providerChainId;
      }

      const relevantChainId = chainIdToUse || chainId;

      return (
        relevantChainId ||
        // @ts-expect-error The utils/network file is still JS
        NetworkList[networkClientIdForDomain]?.chainId
      );
    },
  );

// TODO: [SOLANA] - This do not support non evm networks, need to revisit
export const makeSelectRpcUrl = () =>
  createSelector(
    [
      selectEvmNetworkConfigurationsByChainId,
      selectProviderRpcUrl,
      selectNetworkClientIdForDomain,
      selectEvmChainId,
      (_: RootState, hostname?: string) => hostname,
    ],
    (
      networkConfigurations,
      providerRpcUrl,
      networkClientIdForDomain,
      chainId,
      hostname,
    ) => {
      if (isNonEvmChainId(chainId)) {
        return;
      }
      if (!hostname) return providerRpcUrl;

      return networkConfigurations[chainId]?.rpcEndpoints.find(
        ({ networkClientId }) => networkClientId === networkClientIdForDomain,
      )?.url;
    },
  );

export const makeSelectDomainIsConnectedDapp = () =>
  createSelector(
    [
      selectNetworkClientIdsByDomains,
      (_: RootState, hostname?: string) => hostname,
    ],
    (networkClientIdsByDomains, hostname) =>
      Boolean(hostname && networkClientIdsByDomains?.[hostname]),
  );

export const selectPerOriginChainId = (state: RootState, hostname?: string) => {
  const chainIdSelector = makeSelectChainId();
  return chainIdSelector(state, hostname);
};

export const useNetworkInfo = (hostname?: string) => {
  const selectNetworkName = useMemo(() => makeSelectNetworkName(), []);
  const selectNetworkImageSource = useMemo(
    () => makeSelectNetworkImageSource(),
    [],
  );
  const selectDomainNetworkClientId = useMemo(
    () => makeSelectDomainNetworkClientId(),
    [],
  );
  const selectCurrentChainId = useMemo(() => makeSelectChainId(), []);
  const selectRpcUrl = useMemo(() => makeSelectRpcUrl(), []);
  const selectDomainIsConnectedDapp = useMemo(
    () => makeSelectDomainIsConnectedDapp(),
    [],
  );

  const networkName = useSelector((state: RootState) =>
    selectNetworkName(state, hostname),
  );
  const networkImageSource = useSelector((state: RootState) =>
    selectNetworkImageSource(state, hostname),
  );
  const domainNetworkClientId = useSelector((state: RootState) =>
    selectDomainNetworkClientId(state, hostname),
  );
  const chainId = useSelector((state: RootState) =>
    selectCurrentChainId(state, hostname),
  );
  const rpcUrl = useSelector((state: RootState) =>
    selectRpcUrl(state, hostname),
  );
  const domainIsConnectedDapp = useSelector((state: RootState) =>
    selectDomainIsConnectedDapp(state, hostname),
  );

  return {
    networkName,
    networkImageSource,
    domainNetworkClientId,
    chainId,
    rpcUrl,
    domainIsConnectedDapp,
  };
};

export const useDomainNetworkClientId = (hostname: string) => {
  const selectDomainNetworkClientId = useMemo(
    () => makeSelectDomainNetworkClientId(),
    [],
  );

  return useSelector((state: RootState) =>
    selectDomainNetworkClientId(state, hostname),
  );
};
