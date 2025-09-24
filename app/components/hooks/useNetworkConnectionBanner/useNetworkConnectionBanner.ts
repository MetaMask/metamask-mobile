import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Hex, hexToNumber } from '@metamask/utils';
import {
  NetworkConfiguration,
  NetworkStatus,
} from '@metamask/network-controller';
import { useNavigation } from '@react-navigation/native';
import { selectNetworkConnectionBannerState } from '../../../selectors/networkConnectionBanner';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../useMetrics';
import {
  hideNetworkConnectionBanner,
  showNetworkConnectionBanner,
} from '../../../actions/networkConnectionBanner';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { NetworkConnectionBannerStatus } from '../../UI/NetworkConnectionBanner/types';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { NetworkConnectionBannerState } from '../../../reducers/networkConnectionBanner';

const SLOW_BANNER_TIMEOUT = 5 * 1000; // 5 seconds
const UNAVAILABLE_BANNER_TIMEOUT = 30 * 1000; // 30 seconds

const useNetworkConnectionBanner = (): {
  networkConnectionBannerState: NetworkConnectionBannerState;
  currentNetwork: NetworkConfiguration | undefined;
  updateRpc: (
    network: NetworkConfiguration,
    status: NetworkConnectionBannerStatus,
  ) => void;
} => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const networkConnectionBannerState = useSelector(
    selectNetworkConnectionBannerState,
  );

  // Use ref to access current banner state without causing timer effect to re-run
  const bannerStateRef = useRef(networkConnectionBannerState);

  const networkConfigurationByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const evmEnabledNetworksChainIds = useSelector(selectEVMEnabledNetworks);
  const currentNetwork = networkConnectionBannerState.visible
    ? networkConfigurationByChainId[networkConnectionBannerState.chainId]
    : undefined;

  useEffect(() => {
    Engine.lookupEnabledNetworks();
  }, []);

  function updateRpc(
    network: NetworkConfiguration,
    status: NetworkConnectionBannerStatus,
  ) {
    const defaultEndpointIndex = network.defaultRpcEndpointIndex || 0;
    const rpcUrl =
      network.rpcEndpoints[defaultEndpointIndex]?.url ||
      network.rpcEndpoints[0]?.url;

    navigation.navigate(Routes.EDIT_NETWORK, {
      network: rpcUrl,
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });

    // Tracking the event
    trackEvent(
      createEventBuilder(
        status === 'slow'
          ? MetaMetricsEvents.SLOW_RPC_UPDATE_RPC_CLICKED
          : MetaMetricsEvents.UNAVAILABLE_RPC_UPDATE_RPC_CLICKED,
      )
        .addProperties({
          chain_id_caip: `eip155:${hexToNumber(network.chainId)}`,
        })
        .build(),
    );

    dispatch(hideNetworkConnectionBanner());
  }

  useEffect(() => {
    const checkNetworkStatus = (timeoutType: NetworkConnectionBannerStatus) => {
      const currentBannerState = bannerStateRef.current;
      const networksMetadata =
        Engine.context.NetworkController.state.networksMetadata;

      let firstUnavailableNetwork: {
        chainId: Hex;
        status: NetworkConnectionBannerStatus;
      } | null = null;

      for (const evmEnabledNetworkChainId of evmEnabledNetworksChainIds) {
        try {
          const networkClientId =
            Engine.context.NetworkController.findNetworkClientIdByChainId(
              evmEnabledNetworkChainId,
            );
          const networkMetadata = networksMetadata[networkClientId];
          if (!networkMetadata) {
            continue;
          }
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
        } catch {
          // TODO: remove this once we update the fixtures on e2e tests
          // If there is an error, continue to the next network
          // findNetworkClientIdByChainId and getNetworkConfigurationByNetworkClientId can throw errors
          continue;
        }
      }

      if (firstUnavailableNetwork) {
        // Show/update banner if:
        // 1. No banner is currently visible, OR
        // 2. Banner is visible but for a different network, OR
        // 3. Banner is visible for the same network but with a different status
        const shouldShowBanner =
          !currentBannerState.visible ||
          (currentBannerState.visible &&
            currentBannerState.chainId !== firstUnavailableNetwork.chainId) ||
          (currentBannerState.visible &&
            currentBannerState.chainId === firstUnavailableNetwork.chainId &&
            currentBannerState.status !== firstUnavailableNetwork.status);

        if (shouldShowBanner) {
          dispatch(
            showNetworkConnectionBanner({
              chainId: firstUnavailableNetwork.chainId,
              status: firstUnavailableNetwork.status,
            }),
          );
        }
      } else if (currentBannerState.visible) {
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
  }, [evmEnabledNetworksChainIds, dispatch]);

  useEffect(() => {
    bannerStateRef.current = networkConnectionBannerState;
  }, [networkConnectionBannerState]);

  useEffect(() => {
    if (networkConnectionBannerState.visible) {
      trackEvent(
        createEventBuilder(
          networkConnectionBannerState.status === 'slow'
            ? MetaMetricsEvents.SLOW_RPC_BANNER_SHOWN
            : MetaMetricsEvents.UNAVAILABLE_RPC_BANNER_SHOWN,
        )
          .addProperties({
            chain_id_caip: `eip155:${hexToNumber(
              networkConnectionBannerState.chainId,
            )}`,
          })
          .build(),
      );
    }
  }, [networkConnectionBannerState, trackEvent, createEventBuilder]);

  return {
    networkConnectionBannerState,
    currentNetwork,
    updateRpc,
  };
};

export default useNetworkConnectionBanner;
