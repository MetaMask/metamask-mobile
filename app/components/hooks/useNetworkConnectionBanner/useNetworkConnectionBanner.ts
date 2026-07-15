import { useCallback, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Hex, hexToNumber } from '@metamask/utils';
import { NetworkStatus } from '@metamask/network-controller';
import { useNavigation } from '@react-navigation/native';
import { selectNetworkConnectionBannerState } from '../../../selectors/networkConnectionBanner';
import { selectIsDeviceOffline } from '../../../selectors/connectivityController';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import { useAnalytics } from '../useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
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
import { getDomain } from '../../../util/url-utils';
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
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { toastRef } = useContext(ToastContext);
  const networkConnectionBannerState = useSelector(
    selectNetworkConnectionBannerState,
  );
  const isOffline = useSelector(selectIsDeviceOffline);

  // Use ref to access current banner state without causing timer effect to re-run
  const bannerStateRef = useRef(networkConnectionBannerState);

  const evmEnabledNetworksChainIds = useSelector(selectEVMEnabledNetworks);

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

      // Collect every enabled EVM network whose default RPC endpoint is
      // currently failing (status !== Available). We need the full list to
      // decide whether to show the banner per the rules below.
      const failedNetworks: {
        chainId: Hex;
        networkName: string;
        rpcUrl: string;
        isInfuraEndpoint: boolean;
        infuraNetworkClientId?: string;
        domain: string | null;
      }[] = [];
      let totalEnabled = 0;

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

          const networkConfig =
            Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId(
              networkClientId,
            );
          if (!networkConfig) {
            continue;
          }

          totalEnabled += 1;

          if (
            networkMetadata.status === NetworkStatus.Available ||
            networkMetadata.status === NetworkStatus.Unknown
          ) {
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
          let infuraNetworkClientId: string | undefined;
          if (!isInfuraEndpoint) {
            const infuraEndpoint = networkConfig.rpcEndpoints.find(
              (endpoint, index) =>
                index !== defaultRpcEndpointIndex &&
                getIsMetaMaskInfuraEndpointUrl(endpoint.url, infuraProjectId),
            );
            infuraNetworkClientId = infuraEndpoint?.networkClientId;
          }

          failedNetworks.push({
            chainId: evmEnabledNetworkChainId,
            networkName: networkConfig.name,
            rpcUrl,
            isInfuraEndpoint,
            infuraNetworkClientId,
            domain: getDomain(rpcUrl),
          });
        } catch {
          // TODO: remove this once we update the fixtures on e2e tests
          // findNetworkClientIdByChainId and getNetworkConfigurationByNetworkClientId can throw
          continue;
        }
      }

      const firstCustomFailed = failedNetworks.find((n) => !n.isInfuraEndpoint);
      const distinctDomains = new Set(
        failedNetworks
          .map((n) => n.domain)
          .filter((domain): domain is string => domain !== null),
      ).size;
      const areAllEnabledNetworksFailed =
        failedNetworks.length > 0 && failedNetworks.length === totalEnabled;

      // Show the banner if:
      // - The first failing network is a custom network (users always want to
      //   be informed about errors with RPC endpoints they've chosen), or
      // - There are failures across more than one registrable domain (likely
      //   client-side issue), or
      // - All enabled networks are failing (escape hatch for single-network
      //   users so they still get a signal).
      // A wide single-provider outage on a multi-network setup (e.g. every
      // *.infura.io network goes down at once) collapses to one domain and
      // is suppressed unless that user's entire enabled set is on it.
      const shouldShowBanner = Boolean(
        firstCustomFailed || distinctDomains > 1 || areAllEnabledNetworksFailed,
      );

      if (shouldShowBanner) {
        const selected = firstCustomFailed ?? failedNetworks[0];
        // Show/update banner if:
        // 1. No banner is currently visible, OR
        // 2. Banner is visible but for a different network, OR
        // 3. Banner is visible for the same network but with a different status
        const shouldDispatch =
          !currentBannerState.visible ||
          currentBannerState.chainId !== selected.chainId ||
          currentBannerState.status !== timeoutType;

        if (shouldDispatch) {
          dispatch(
            showNetworkConnectionBanner({
              chainId: selected.chainId,
              status: timeoutType,
              networkName: selected.networkName,
              rpcUrl: selected.rpcUrl,
              isInfuraEndpoint: selected.isInfuraEndpoint,
              infuraNetworkClientId: selected.infuraNetworkClientId,
            }),
          );
        }
      } else if (currentBannerState.visible) {
        // Hide banner: either no networks are failing, or failures are confined
        // to a single provider and don't warrant the banner.
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

    const { infuraNetworkClientId } = networkConnectionBannerState;
    if (!infuraNetworkClientId) {
      return;
    }

    // Find the endpoint index by networkClientId
    const infuraEndpointIndex = networkConfiguration.rpcEndpoints.findIndex(
      (endpoint) => endpoint.networkClientId === infuraNetworkClientId,
    );
    // Skip if endpoint not found or it's already the default
    if (
      infuraEndpointIndex === -1 ||
      infuraEndpointIndex === networkConfiguration.defaultRpcEndpointIndex
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
          defaultRpcEndpointIndex: infuraEndpointIndex,
        },
        {
          replacementSelectedRpcEndpointIndex: infuraEndpointIndex,
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
