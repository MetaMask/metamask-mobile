import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Hex, hexToNumber } from '@metamask/utils';
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
  hideNetworkConnectionBanner,
  showNetworkConnectionBanner,
} from '../../../actions/networkConnectionBanners';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { NetworkConnectionBannerStatus } from '../../UI/NetworkConnectionBanner/types';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { NetworkConnectionBannersState } from '../../../reducers/networkConnectionBanners';

const SLOW_BANNER_TIMEOUT = 5 * 1000; // 5 seconds
const UNAVAILABLE_BANNER_TIMEOUT = 30 * 1000; // 30 seconds

const useNetworkConnectionBanners = (): {
  networkConnectionBannersState: NetworkConnectionBannersState;
  currentNetwork: NetworkConfiguration | undefined;
  editRpc: () => void;
} => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const networkConnectionBannersState = useSelector(
    selectNetworkConnectionBannersState,
  );

  const networkConfigurationByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const evmEnabledNetworksChainIds = useSelector(selectEVMEnabledNetworks);
  const currentNetwork = networkConnectionBannersState.visible
    ? networkConfigurationByChainId[networkConnectionBannersState.chainId]
    : undefined;

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
      createEventBuilder(MetaMetricsEvents.SLOW_RPC_BANNER_EDIT_RPC_CLICKED)
        .addProperties({
          chain_id_caip: `eip155:${hexToNumber(currentNetwork.chainId)}`,
        })
        .build(),
    );

    dispatch(hideNetworkConnectionBanner());
  }

  useEffect(() => {
    const checkNetworkStatus = (timeoutType: NetworkConnectionBannerStatus) => {
      const networksMetadata =
        Engine.context.NetworkController.state.networksMetadata;

      let firstUnavailableNetwork: {
        chainId: Hex;
        status: NetworkConnectionBannerStatus;
      } | null = null;

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
            continue;
          }

          firstUnavailableNetwork = {
            chainId: evmEnabledNetworkChainId,
            status: timeoutType,
          };

          break; // Only show one banner at a time
        }
      }

      if (firstUnavailableNetwork) {
        // Show/update banner if:
        // 1. No banner is currently visible, OR
        // 2. Banner is visible but for a different network, OR
        // 3. Banner is visible for the same network but with a different status
        const shouldShowBanner =
          !networkConnectionBannersState.visible ||
          (networkConnectionBannersState.visible &&
            networkConnectionBannersState.chainId !==
              firstUnavailableNetwork.chainId) ||
          (networkConnectionBannersState.visible &&
            networkConnectionBannersState.chainId ===
              firstUnavailableNetwork.chainId &&
            networkConnectionBannersState.status !==
              firstUnavailableNetwork.status);

        if (shouldShowBanner) {
          dispatch(
            showNetworkConnectionBanner({
              chainId: firstUnavailableNetwork.chainId,
              status: firstUnavailableNetwork.status,
            }),
          );

          trackEvent(
            createEventBuilder(
              firstUnavailableNetwork.status === 'slow'
                ? MetaMetricsEvents.SLOW_RPC_BANNER_SHOWN
                : MetaMetricsEvents.UNAVAILABLE_RPC_BANNER_SHOWN,
            )
              .addProperties({
                chain_id_caip: `eip155:${hexToNumber(
                  firstUnavailableNetwork.chainId,
                )}`,
              })
              .build(),
          );
        }
      } else if (networkConnectionBannersState.visible) {
        // Hide banner if all networks are available
        dispatch(hideNetworkConnectionBanner());
      }
    };

    // Set up slow banner timeout (5 seconds)
    const slowTimeout = setTimeout(() => {
      checkNetworkStatus('slow');
    }, SLOW_BANNER_TIMEOUT);

    // Set up unavailable banner timeout (30 seconds)
    const unavailableTimeout = setTimeout(() => {
      checkNetworkStatus('unavailable');
    }, UNAVAILABLE_BANNER_TIMEOUT);

    return () => {
      clearTimeout(slowTimeout);
      clearTimeout(unavailableTimeout);
    };
  }, [
    evmEnabledNetworksChainIds,
    dispatch,
    networkConnectionBannersState,
    trackEvent,
    createEventBuilder,
  ]);

  return {
    networkConnectionBannersState,
    currentNetwork,
    editRpc,
  };
};

export default useNetworkConnectionBanners;
