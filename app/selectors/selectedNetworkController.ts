import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { ProviderConfig } from '@metamask/network-controller';
import { SelectedNetworkControllerState } from '@metamask/selected-network-controller';
import { getNetworkImageSource, NetworkList } from '../util/networks';
import {
  selectProviderConfig,
  selectNetworkClientId,
  selectNetworkConfigurations,
  selectChainId as selectProviderChainId,
  selectRpcUrl as selectProviderRpcUrl,
} from './networkController';

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

const selectProviderNetworkName = createSelector(
  [selectProviderConfig, selectNetworkConfigurations],
  (providerConfig: ProviderConfig, networkConfigurations) => {
    if (providerConfig.type === 'rpc') {
      return (
        networkConfigurations[providerConfig.nickname]?.nickname ||
        providerConfig.nickname
      );
    }
    // @ts-expect-error The utils/network file is still JS
    return NetworkList[providerConfig.type]?.name || providerConfig.nickname;
  },
);

const selectProviderNetworkImageSource = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => {
    return getNetworkImageSource({
      networkType: providerConfig.type,
      chainId: providerConfig.chainId,
    });
  },
);

export const makeSelectNetworkName = () =>
  createSelector(
    [
      selectNetworkConfigurations,
      selectProviderNetworkName,
      makeSelectDomainNetworkClientId(),
      selectNetworkClientId,
      (_: RootState, hostname?: string) => hostname,
    ],
    (
      networkConfigurations,
      providerNetworkName,
      domainNetworkClientId,
      globalNetworkClientId,
      hostname,
    ) => {
      if (!hostname) return providerNetworkName;
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      // @ts-expect-error The utils/network file is still JS
      return (
        networkConfigurations[relevantNetworkClientId]?.nickname ||
        NetworkList[relevantNetworkClientId]?.name
      );
    },
  );

export const makeSelectNetworkImageSource = () =>
  createSelector(
    [
      selectNetworkConfigurations,
      selectProviderNetworkImageSource,
      makeSelectDomainNetworkClientId(),
      selectNetworkClientId,
      (_: RootState, hostname?: string) => hostname,
    ],
    (
      networkConfigurations,
      providerNetworkImageSource,
      domainNetworkClientId,
      globalNetworkClientId,
      hostname,
    ) => {
      if (!hostname) return providerNetworkImageSource;
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      const networkConfig = networkConfigurations[relevantNetworkClientId];
      if (networkConfig) {
        // @ts-expect-error The utils/network file is still JS and this function expects a networkType, and should be optional
        return getNetworkImageSource({ chainId: networkConfig.chainId });
      } else {
        return getNetworkImageSource({
          // @ts-expect-error The utils/network file is still JS
          networkType: NetworkList[relevantNetworkClientId]?.networkType,
          // @ts-expect-error The utils/network file is still JS
          chainId: NetworkList[relevantNetworkClientId]?.chainId,
        });
      }
    },
  );

export const makeSelectChainId = () =>
  createSelector(
    [
      selectNetworkConfigurations,
      selectProviderChainId,
      makeSelectDomainNetworkClientId(),
      selectNetworkClientId,
      (_: RootState, hostname?: string) => hostname,
    ],
    (
      networkConfigurations,
      providerChainId,
      domainNetworkClientId,
      globalNetworkClientId,
      hostname,
    ) => {
      if (!hostname) {
        return providerChainId;
      }
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      return (
        networkConfigurations[relevantNetworkClientId]?.chainId ||
        // @ts-expect-error The utils/network file is still JS
        NetworkList[relevantNetworkClientId]?.chainId
      );
    },
  );

export const makeSelectRpcUrl = () =>
  createSelector(
    [
      selectNetworkConfigurations,
      selectProviderRpcUrl,
      makeSelectDomainNetworkClientId(),
      selectNetworkClientId,
      (_: RootState, hostname?: string) => hostname,
    ],
    (
      networkConfigurations,
      providerRpcUrl,
      domainNetworkClientId,
      globalNetworkClientId,
      hostname,
    ) => {
      if (!hostname) return providerRpcUrl;
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      return networkConfigurations[relevantNetworkClientId]?.rpcUrl;
    },
  );

export const makeSelectDomainIsConnectedDapp = () =>
  createSelector(
    [
      selectNetworkClientIdsByDomains,
      (_: RootState, hostname?: string) => hostname,
    ],
    (networkClientIdsByDomains, hostname) => {
      return Boolean(hostname && networkClientIdsByDomains?.[hostname]);
    },
  );

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
  const selectChainId = useMemo(() => makeSelectChainId(), []);
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
    selectChainId(state, hostname),
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
