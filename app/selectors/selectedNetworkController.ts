import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { NetworkState } from '@metamask/network-controller';
import { SelectedNetworkControllerState } from '@metamask/selected-network-controller';
import { getNetworkImageSource, NetworkList } from '../util/networks';

const selectNetworkControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NetworkController;

const selectSelectedNetworkControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.SelectedNetworkController;

export const selectNetworkConfigurations = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState.networkConfigurations,
);

export const selectNetworkClientId = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState.selectedNetworkClientId,
);

export const selectNetworkClientIdsByDomains = createSelector(
  selectSelectedNetworkControllerState,
  (selectedNetworkControllerState: SelectedNetworkControllerState) =>
    selectedNetworkControllerState?.domains,
);

export const makeSelectDomainIsConnectedDapp = () =>
  createSelector(
    [
      selectNetworkClientIdsByDomains,
      (_: RootState, hostname: string) => hostname,
    ],
    (networkClientIdsByDomains, hostname) => {
      return Boolean(networkClientIdsByDomains?.[hostname]);
    },
  );

export const makeSelectDomainNetworkClientId = () =>
  createSelector(
    [
      selectNetworkClientIdsByDomains,
      (_: RootState, hostname: string) => hostname,
    ],
    (networkClientIdsByDomains, hostname) =>
      networkClientIdsByDomains?.[hostname],
  );

export const makeSelectNetworkName = () =>
  createSelector(
    [
      selectNetworkConfigurations,
      selectNetworkClientId,
      makeSelectDomainNetworkClientId(),
      (_: RootState, hostname: string) => hostname,
    ],
    (networkConfigurations, globalNetworkClientId, domainNetworkClientId) => {
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      return (
        networkConfigurations[relevantNetworkClientId]?.nickname ||
        //@ts-expect-error - The utils/network file is still JS
        NetworkList[relevantNetworkClientId]?.name
      );
    },
  );

export const makeSelectNetworkImageSource = () =>
  createSelector(
    [
      selectNetworkConfigurations,
      selectNetworkClientId,
      makeSelectDomainNetworkClientId(),
      (_: RootState, hostname: string) => hostname,
    ],
    (networkConfigurations, globalNetworkClientId, domainNetworkClientId) => {
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      const networkConfig = networkConfigurations[relevantNetworkClientId];

      if (networkConfig) {
        //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
        return getNetworkImageSource({
          chainId: networkConfig.chainId,
        });
      } else {
        return getNetworkImageSource({
          //@ts-expect-error - The utils/network file is still JS
          networkType: NetworkList[relevantNetworkClientId].networkType,
          //@ts-expect-error - The utils/network file is still JS
          chainId: NetworkList[relevantNetworkClientId].chainId,
        });
      }
    },
  );

export const makeSelectChainId = () =>
  createSelector(
    [
      selectNetworkConfigurations,
      selectNetworkClientId,
      makeSelectDomainNetworkClientId(),
      (_: RootState, hostname: string) => hostname,
    ],
    (networkConfigurations, globalNetworkClientId, domainNetworkClientId) => {
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      return (
        networkConfigurations[relevantNetworkClientId]?.chainId ||
        //@ts-expect-error - The utils/network file is still JS
        NetworkList[relevantNetworkClientId]?.chainId
      );
    },
  );

export const makeSelectRpcUrl = () =>
  createSelector(
    [
      selectNetworkConfigurations,
      selectNetworkClientId,
      makeSelectDomainNetworkClientId(),
      (_: RootState, hostname: string) => hostname,
    ],
    (networkConfigurations, globalNetworkClientId, domainNetworkClientId) => {
      const relevantNetworkClientId =
        domainNetworkClientId || globalNetworkClientId;
      return (
        networkConfigurations[relevantNetworkClientId]?.rpcUrl ||
        //@ts-expect-error - The utils/network file is still JS
        // TODO ALEX this isn't where the rpcUrl is stored for preloaded networks
        NetworkList[relevantNetworkClientId]?.rpcUrl
      );
    },
  );

export const useNetworkInfo = (hostname?: string) => {
  if (!hostname)
    return {
      networkName: '',
      networkImageSource: '',
      domainNetworkClientId: '',
      chainId: '',
      rpcUrl: '',
    };
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
