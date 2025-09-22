import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Hex, hexToNumber, KnownCaipNamespace } from '@metamask/utils';
import {
  NetworkConfiguration,
  NetworkStatus,
} from '@metamask/network-controller';
import { useNavigation } from '@react-navigation/native';
import { selectNetworkConnectionBannersState } from '../../../selectors/networkConnectionBanners';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../useMetrics';
import {
  hideSlowRpcConnectionBanner,
  showSlowRpcConnectionBanner,
} from '../../../actions/networkConnectionBanners';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';

const BANNER_TIMEOUT = 5000; // 5 seconds - shows banner

const useNetworkConnectionBanners = (): {
  visible: boolean;
  chainId: Hex | undefined;
  currentNetwork: NetworkConfiguration | undefined;
  editRpc: () => void;
} => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { enabledNetworksByNamespace } = useNetworkEnablement();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { visible, chainId } = useSelector(selectNetworkConnectionBannersState);
  const networkConfigurationByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const evmEnabledNetworksChainIds = useMemo(
    () =>
      Object.entries(enabledNetworksByNamespace[KnownCaipNamespace.Eip155])
        .filter(([, isEnabled]) => isEnabled)
        .map(([networkChainId]) => networkChainId as Hex),
    [enabledNetworksByNamespace],
  );
  const currentNetwork = useMemo(
    () => (chainId ? networkConfigurationByChainId[chainId] : undefined),
    [networkConfigurationByChainId, chainId],
  );

  useEffect(() => {
    Engine.lookupEnabledNetworks();
  }, []);

  function editRpc() {
    if (!currentNetwork) {
      return;
    }

    const defaultEndpointIndex = currentNetwork.defaultRpcEndpointIndex || 0;
    const rpcUrl =
      currentNetwork.rpcEndpoints[defaultEndpointIndex]?.url ||
      currentNetwork.rpcEndpoints[0]?.url;

    navigation.navigate(Routes.EDIT_NETWORK, {
      network: rpcUrl,
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });

    // Tracking the event
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SLOW_RPC_MONITORING_BANNER_EDIT_RPC_CLICKED,
      )
        .addProperties({
          chain_id_caip: `eip155:${hexToNumber(currentNetwork.chainId)}`,
        })
        .build(),
    );

    dispatch(hideSlowRpcConnectionBanner());
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      const networksMetadata =
        Engine.context.NetworkController.state.networksMetadata;
      let hasUnavailableNetwork = false;
      for (const evmEnabledNetworkChainId of evmEnabledNetworksChainIds) {
        const networkClientId =
          Engine.context.NetworkController.findNetworkClientIdByChainId(
            evmEnabledNetworkChainId,
          );
        const networkMetadata = networksMetadata[networkClientId];
        const networkStatus = networkMetadata?.status;

        if (networkStatus !== NetworkStatus.Available) {
          const networkConfig =
            Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId(
              networkClientId,
            );

          if (!networkConfig) {
            hasUnavailableNetwork = true;
            continue;
          }

          // Show the banner for the first slow network only
          if (!visible) {
            dispatch(showSlowRpcConnectionBanner(evmEnabledNetworkChainId));

            trackEvent(
              createEventBuilder(
                MetaMetricsEvents.SLOW_RPC_MONITORING_BANNER_EDIT_RPC_CLICKED,
              )
                .addProperties({
                  chain_id_caip: `eip155:${hexToNumber(
                    evmEnabledNetworkChainId,
                  )}`,
                })
                .build(),
            );

            break;
          }
        }
      }

      if (visible && !hasUnavailableNetwork) {
        dispatch(hideSlowRpcConnectionBanner());
      }
    }, BANNER_TIMEOUT);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evmEnabledNetworksChainIds, createEventBuilder, dispatch, trackEvent]);

  return { visible, chainId, currentNetwork, editRpc };
};

export default useNetworkConnectionBanners;
