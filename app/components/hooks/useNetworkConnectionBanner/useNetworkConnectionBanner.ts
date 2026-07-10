import { useCallback, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { hexToNumber } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import type {
  FailedNetwork,
  NetworkConnectionBannerStatus,
} from '@metamask/network-connection-banner-controller';
import {
  selectNetworkConnectionBannerStatus,
  selectNetworkConnectionBannerNetwork,
} from '../../../selectors/networkConnectionBanner';
import { useMessenger } from '../../../hooks/useMessenger';
import Engine from '../../../core/Engine';
import type { RouteMessengerInstance } from '../../Views/Wallet/messenger';
import Routes from '../../../constants/navigation/Routes';
import { useAnalytics } from '../useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { isPublicEndpointUrl } from '../../../core/Engine/controllers/network-controller/utils';
import onlyKeepHost from '../../../util/onlyKeepHost';
import { INFURA_PROJECT_ID } from '../../../constants/network';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';

const infuraProjectId = INFURA_PROJECT_ID ?? '';

function sanitizeRpcUrl(rpcUrl: string) {
  return isPublicEndpointUrl(rpcUrl, infuraProjectId)
    ? onlyKeepHost(rpcUrl)
    : 'custom';
}

const useNetworkConnectionBanner = (): {
  status: NetworkConnectionBannerStatus;
  network: FailedNetwork | null;
  updateRpc: () => void;
  /**
   * Switch the default RPC endpoint to Infura for the current unavailable network.
   * Only available when the network has an Infura endpoint to switch to.
   * Returns a promise that resolves when the switch is complete (or rejects on error).
   */
  switchToInfura: () => Promise<void>;
} => {
  const navigation = useNavigation();
  const messenger = useMessenger<RouteMessengerInstance>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { toastRef } = useContext(ToastContext);
  const status = useSelector(selectNetworkConnectionBannerStatus);
  const network = useSelector(selectNetworkConnectionBannerNetwork);

  // Refresh connectivity metadata for every enabled network when the banner
  // mounts. NetworkController only keeps the selected network's metadata fresh
  // on its own, but the banner rule needs it for all enabled networks.
  useEffect(() => {
    Engine.lookupEnabledNetworks();
  }, []);

  // Fire analytics whenever the banner is visible. The banner's show/hide
  // and 5s/30s escalation are driven by NetworkConnectionBannerController.
  useEffect(() => {
    if ((status === 'degraded' || status === 'unavailable') && network) {
      const sanitizedUrl = sanitizeRpcUrl(network.rpcUrl);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN)
          .addProperties({
            banner_type: status,
            chain_id_caip: `eip155:${hexToNumber(network.chainId)}`,
            rpc_endpoint_url: sanitizedUrl,
            rpc_domain: sanitizedUrl,
          })
          .build(),
      );
    }
  }, [status, network, trackEvent, createEventBuilder]);

  const updateRpc = useCallback(() => {
    if ((status !== 'degraded' && status !== 'unavailable') || !network) {
      return;
    }

    navigation.navigate(Routes.EDIT_NETWORK, {
      network: network.rpcUrl,
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
      trackRpcUpdateFromBanner: true,
    });

    const sanitizedUrl = sanitizeRpcUrl(network.rpcUrl);
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
      )
        .addProperties({
          banner_type: status,
          chain_id_caip: `eip155:${hexToNumber(network.chainId)}`,
          // @deprecated: will be removed in a future release
          rpc_endpoint_url: sanitizedUrl,
          rpc_domain: sanitizedUrl,
        })
        .build(),
    );
  }, [status, network, navigation, trackEvent, createEventBuilder]);

  const switchToInfura = useCallback(async () => {
    if (
      (status !== 'degraded' && status !== 'unavailable') ||
      !network ||
      network.switchableInfuraNetworkClientId === null
    ) {
      return;
    }

    const sanitizedUrl = sanitizeRpcUrl(network.rpcUrl);
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SWITCH_TO_METAMASK_DEFAULT_RPC_CLICKED,
      )
        .addProperties({
          banner_type: status,
          chain_id_caip: `eip155:${hexToNumber(network.chainId)}`,
          rpc_endpoint_url: sanitizedUrl,
          rpc_domain: sanitizedUrl,
        })
        .build(),
    );

    try {
      await messenger.call(
        'NetworkConnectionBannerController:switchToDefaultInfuraRpcEndpoint',
        network.chainId,
      );

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
    } catch (error) {
      // Do not show the success toast on failure
      console.error(
        'Failed to switch to the default Infura RPC endpoint:',
        error,
      );
    }
  }, [status, network, messenger, trackEvent, createEventBuilder, toastRef]);

  return {
    status,
    network,
    updateRpc,
    switchToInfura,
  };
};

export default useNetworkConnectionBanner;
