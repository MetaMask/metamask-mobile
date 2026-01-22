import { useCallback, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Hex, hexToNumber } from '@metamask/utils';
import { NetworkStatus } from '@metamask/network-controller';
import { useNavigation } from '@react-navigation/native';
import { selectNetworkConnectionBannerState } from '../../../selectors/networkConnectionBanner';
import { selectIsDeviceOffline } from '../../../selectors/connectivityController';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../useMetrics';
import {
  hideNetworkConnectionBanner,
  showNetworkConnectionBanner,
} from '../../../actions/networkConnectionBanner';
import { NetworkConnectionBannerStatus } from '../../UI/NetworkConnectionBanner/types';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { NetworkConnectionBannerState } from '../../../reducers/networkConnectionBanner';
import {
  isPublicEndpointUrl,
  getIsMetaMaskInfuraEndpointUrl,
} from '../../../core/Engine/controllers/network-controller/utils';
import onlyKeepHost from '../../../util/onlyKeepHost';
import { INFURA_PROJECT_ID } from '../../../constants/network';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';

const infuraProjectId = INFURA_PROJECT_ID ?? '';

const DEGRADED_BANNER_TIMEOUT = 5 * 1000; // 5 seconds
const UNAVAILABLE_BANNER_TIMEOUT = 30 * 1000; // 30 seconds

function sanitizeRpcUrl(rpcUrl: string) {
  return isPublicEndpointUrl(rpcUrl, infuraProjectId)
    ? onlyKeepHost(rpcUrl)
    : 'custom';
}

const useNetworkConnectionBanner = (): {
  networkConnectionBannerState: NetworkConnectionBannerState;
  updateRpc: (
    rpcUrl: string,
    status: NetworkConnectionBannerStatus,
    chainId: string,
  ) => void;
  /**
   * Switch the default RPC endpoint to Infura for the current unavailable network.
   * Only available when the network has an Infura endpoint to switch to.
   * Returns a promise that resolves when the switch is complete (or rejects on error).
   */
  switchToInfura: () => Promise<void>;
} => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { toastRef } = useContext(ToastContext);
  const networkConnectionBannerState = useSelector(
    selectNetworkConnectionBannerState,
  );
  const isOffline = useSelector(selectIsDeviceOffline);

  // Use ref to access current banner state without causing timer effect to re-run
  const bannerStateRef = useRef(networkConnectionBannerState);

  const evmEnabledNetworksChainIds = useSelector(selectEVMEnabledNetworks);

  useEffect(() => {
    Engine.lookupEnabledNetworks();
  }, []);

  function updateRpc(
    rpcUrl: string,
    status: NetworkConnectionBannerStatus,
    chainId: string,
  ) {
    navigation.navigate(Routes.EDIT_NETWORK, {
      network: rpcUrl,
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
      trackRpcUpdateFromBanner: true,
    });

    const sanitizedUrl = sanitizeRpcUrl(rpcUrl);
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
      )
        .addProperties({
          banner_type: status,
          chain_id_caip: `eip155:${hexToNumber(chainId)}`,
          // @deprecated: will be removed in a future release
          rpc_endpoint_url: sanitizedUrl,
          rpc_domain: sanitizedUrl,
        })
        .build(),
    );
  }

  useEffect(() => {
    // When device is offline, clear timers and reset banner state
    // We don't want to show network degraded/unavailable banners when the real issue
    // is the device's internet connectivity
    if (isOffline) {
      const currentBannerState = bannerStateRef.current;
      if (currentBannerState.visible) {
        dispatch(hideNetworkConnectionBanner());
      }
      return;
    }

    const checkNetworkStatus = (timeoutType: NetworkConnectionBannerStatus) => {
      const currentBannerState = bannerStateRef.current;
      const networksMetadata =
        Engine.context.NetworkController.state.networksMetadata;

      let firstUnavailableNetwork: {
        chainId: Hex;
        status: NetworkConnectionBannerStatus;
        networkName: string;
        rpcUrl: string;
        isInfuraEndpoint: boolean;
        infuraEndpointIndex?: number;
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

            const defaultRpcEndpointIndex =
              networkConfig.defaultRpcEndpointIndex || 0;
            const rpcUrl =
              networkConfig.rpcEndpoints[defaultRpcEndpointIndex]?.url ||
              networkConfig.rpcEndpoints[0]?.url;

            const isInfuraEndpoint = getIsMetaMaskInfuraEndpointUrl(
              rpcUrl,
              infuraProjectId,
            );

            // For custom endpoints (non-Infura), check if there's an Infura
            // endpoint available for this network that we can switch to
            let infuraEndpointIndex: number | undefined;
            if (!isInfuraEndpoint) {
              const foundIndex = networkConfig.rpcEndpoints.findIndex(
                (endpoint, index) =>
                  index !== defaultRpcEndpointIndex &&
                  getIsMetaMaskInfuraEndpointUrl(endpoint.url, infuraProjectId),
              );
              // If no Infura endpoint found, set to undefined
              infuraEndpointIndex = foundIndex === -1 ? undefined : foundIndex;
            }

            firstUnavailableNetwork = {
              chainId: evmEnabledNetworkChainId,
              status: timeoutType,
              networkName: networkConfig.name,
              rpcUrl,
              isInfuraEndpoint,
              infuraEndpointIndex,
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
              networkName: firstUnavailableNetwork.networkName,
              rpcUrl: firstUnavailableNetwork.rpcUrl,
              isInfuraEndpoint: firstUnavailableNetwork.isInfuraEndpoint,
              infuraEndpointIndex: firstUnavailableNetwork.infuraEndpointIndex,
            }),
          );
        }
      } else if (currentBannerState.visible) {
        // Hide banner if all networks are available
        dispatch(hideNetworkConnectionBanner());
      }
    };

    // Set up degraded banner timeout (5 seconds)
    const degradedTimeout = setTimeout(() => {
      checkNetworkStatus('degraded');
    }, DEGRADED_BANNER_TIMEOUT);

    // Set up unavailable banner timeout (30 seconds)
    const unavailableTimeout = setTimeout(() => {
      checkNetworkStatus('unavailable');
    }, UNAVAILABLE_BANNER_TIMEOUT);

    return () => {
      clearTimeout(degradedTimeout);
      clearTimeout(unavailableTimeout);
    };
  }, [isOffline, evmEnabledNetworksChainIds, dispatch]);

  useEffect(() => {
    bannerStateRef.current = networkConnectionBannerState;
  }, [networkConnectionBannerState]);

  // Subscribe to NetworkController:rpcEndpointChainAvailable event
  // to hide the banner when a network becomes available again
  useEffect(() => {
    const handleChainAvailable = ({ chainId }: { chainId: Hex }) => {
      const currentBannerState = bannerStateRef.current;
      // Only hide the banner if it's visible and matches the chain that became available
      if (
        currentBannerState.visible &&
        currentBannerState.chainId === chainId
      ) {
        dispatch(hideNetworkConnectionBanner());
      }
    };

    Engine.controllerMessenger.subscribe(
      'NetworkController:rpcEndpointChainAvailable',
      handleChainAvailable,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'NetworkController:rpcEndpointChainAvailable',
        handleChainAvailable,
      );
    };
  }, [dispatch]);

  useEffect(() => {
    if (networkConnectionBannerState.visible) {
      const sanitizedUrl = sanitizeRpcUrl(networkConnectionBannerState.rpcUrl);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN)
          .addProperties({
            banner_type: networkConnectionBannerState.status,
            chain_id_caip: `eip155:${hexToNumber(
              networkConnectionBannerState.chainId,
            )}`,
            rpc_endpoint_url: sanitizedUrl,
            rpc_domain: sanitizedUrl,
          })
          .build(),
      );
    }
  }, [networkConnectionBannerState, trackEvent, createEventBuilder]);

  /**
   * Switch the default RPC endpoint to Infura for the current unavailable network.
   */
  const switchToInfura = useCallback(async () => {
    if (!networkConnectionBannerState.visible) {
      return;
    }

    const { chainId, status } = networkConnectionBannerState;

    const networkConfiguration =
      Engine.context.NetworkController.getNetworkConfigurationByChainId(
        chainId,
      );
    if (!networkConfiguration) {
      return;
    }

    // Re-calculate infuraEndpointIndex from current config to avoid stale index
    // The stored index may be outdated if endpoints were added/removed/reordered
    const freshInfuraEndpointIndex =
      networkConfiguration.rpcEndpoints.findIndex((endpoint) =>
        getIsMetaMaskInfuraEndpointUrl(endpoint.url, infuraProjectId),
      );
    // Skip if no Infura endpoint found or it's already the default
    if (
      freshInfuraEndpointIndex === -1 ||
      freshInfuraEndpointIndex === networkConfiguration.defaultRpcEndpointIndex
    ) {
      return;
    }

    // Track the switch to MetaMask default RPC event
    const sanitizedUrl = sanitizeRpcUrl(networkConnectionBannerState.rpcUrl);
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SWITCH_TO_METAMASK_DEFAULT_RPC_CLICKED,
      )
        .addProperties({
          banner_type: status,
          chain_id_caip: `eip155:${hexToNumber(chainId)}`,
          rpc_endpoint_url: sanitizedUrl,
          rpc_domain: sanitizedUrl,
        })
        .build(),
    );

    try {
      // Update the network configuration to use the Infura endpoint as default
      await Engine.context.NetworkController.updateNetwork(
        chainId,
        {
          ...networkConfiguration,
          defaultRpcEndpointIndex: freshInfuraEndpointIndex,
        },
        {
          replacementSelectedRpcEndpointIndex: freshInfuraEndpointIndex,
        },
      );

      // Hide banner immediately to prevent stale "Switch to MetaMask default RPC" button
      // The normal status check logic will re-show it with fresh data if network is still unavailable
      dispatch(hideNetworkConnectionBanner());

      // Show success toast
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings(
              'network_connection_banner.updated_to_metamask_default',
            ),
          },
        ],
        iconName: IconName.Confirmation,
        hasNoTimeout: false,
      });
    } catch {
      // Error is already handled by updateNetwork which shows a warning
      // Do not show success toast on failure
    }
  }, [
    networkConnectionBannerState,
    trackEvent,
    createEventBuilder,
    toastRef,
    dispatch,
  ]);

  return {
    networkConnectionBannerState,
    updateRpc,
    switchToInfura,
  };
};

export default useNetworkConnectionBanner;
