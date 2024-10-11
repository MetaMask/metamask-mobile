import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { SelectedNetworkControllerState } from '@metamask/selected-network-controller';
import { getNetworkImageSource, NetworkList } from '../util/networks';
import { strings } from '../../locales/i18n';
import {
  selectProviderConfig,
  selectNetworkClientId,
  selectNetworkConfigurations,
  selectSelectedNetworkClientId,
  selectChainId as selectProviderChainId,
  selectRpcUrl as selectProviderRpcUrl,
  ProviderConfig,
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
  [
    selectProviderConfig,
    selectNetworkConfigurations,
    selectSelectedNetworkClientId,
  ],
  (
    providerConfig: ProviderConfig,
    networkConfigurations,
    selectedNetworkClientId,
  ) => {
    if (providerConfig.type === 'rpc') {
      return (
        networkConfigurations[selectedNetworkClientId]?.nickname ||
        providerConfig.nickname
      );
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
      if (!hostname || !process.env.MULTICHAIN_V1) return providerNetworkName;
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      return (
        networkConfigurations[relevantNetworkClientId]?.nickname ||
        // @ts-expect-error The utils/network file is still JS
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
      if (!hostname || !process.env.MULTICHAIN_V1)
        return providerNetworkImageSource;
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      const networkConfig = networkConfigurations[relevantNetworkClientId];
      if (networkConfig) {
        // @ts-expect-error The utils/network file is still JS and this function expects a networkType, and should be optional
        return getNetworkImageSource({ chainId: networkConfig.chainId });
      }
      return getNetworkImageSource({
        // @ts-expect-error The utils/network file is still JS
        networkType: NetworkList[relevantNetworkClientId]?.networkType,
        // @ts-expect-error The utils/network file is still JS
        chainId: NetworkList[relevantNetworkClientId]?.chainId,
      });
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
      if (!hostname || !process.env.MULTICHAIN_V1) {
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
      if (!hostname || !process.env.MULTICHAIN_V1) return providerRpcUrl;
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
    (networkClientIdsByDomains, hostname) =>
      Boolean(hostname && networkClientIdsByDomains?.[hostname]),
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
