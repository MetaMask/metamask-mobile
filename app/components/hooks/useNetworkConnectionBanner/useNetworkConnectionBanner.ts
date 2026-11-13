import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { hexToNumber } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import type {
  FailedNetwork,
  NetworkConnectionBannerStatus,
} from '@metamask/network-connection-banner-controller';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  selectNetworkConnectionBannerStatus,
  selectNetworkConnectionBannerNetwork,
} from '../../../selectors/networkConnectionBanner';
import { useMessenger } from '../../../hooks/useMessenger';
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
import { useNetworkLatency } from '../../../hooks/useNetworkLatency';
import StorageWrapper from '../../../store/storage-wrapper';
import { SLOW_NETWORK_BANNER_DISMISSED_AT } from '../../../constants/storage';

const infuraProjectId = INFURA_PROJECT_ID ?? '';

export const SLOW_NETWORK_BANNER_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
function sanitizeRpcUrl(rpcUrl: string) {
  return isPublicEndpointUrl(rpcUrl, infuraProjectId)
    ? onlyKeepHost(rpcUrl)
    : 'custom';
}

function isSlowNetworkBannerSnoozed(): boolean {
  const dismissedAt = Number(
    StorageWrapper.getItemSync(SLOW_NETWORK_BANNER_DISMISSED_AT),
  );
  return (
    dismissedAt > 0 && Date.now() - dismissedAt < SLOW_NETWORK_BANNER_SNOOZE_MS
  );
}

const useNetworkConnectionBanner = (): {
  status: NetworkConnectionBannerStatus;
  network: FailedNetwork | null;
  /**
   * True when requests are slow across the board and the RPC banner isn't
   * already showing. Hidden for a week after the user dismisses it.
   */
  isSlowNetwork: boolean;
  dismissSlowNetwork: () => void;
  updateRpc: () => void;
  /**
   * Switch the default RPC endpoint to Infura for the current unavailable network.
   * Only available when the network has an Infura endpoint to switch to.
   * Returns a promise that resolves when the switch is complete (or rejects on error).
   */
  switchToInfura: () => Promise<void>;
} => {
  const navigation = useNavigation<AppNavigationProp>();
  const messenger = useMessenger<RouteMessengerInstance>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { toastRef } = useContext(ToastContext);
  const status = useSelector(selectNetworkConnectionBannerStatus);
  const network = useSelector(selectNetworkConnectionBannerNetwork);
  const latency = useNetworkLatency();
  const [isSlowNetworkSnoozed, setIsSlowNetworkSnoozed] = useState(
    isSlowNetworkBannerSnoozed,
  );

  const isRpcBannerVisible =
    (status === 'degraded' || status === 'unavailable') && Boolean(network);
  const isSlowNetwork =
    !isRpcBannerVisible && latency === 'SLOW' && !isSlowNetworkSnoozed;

  const dismissSlowNetwork = useCallback(() => {
    setIsSlowNetworkSnoozed(true);
    StorageWrapper.setItem(
      SLOW_NETWORK_BANNER_DISMISSED_AT,
      String(Date.now()),
    ).catch(() => undefined);
  }, []);

  // Fire the "shown" analytics once each time the banner becomes visible for a
  // given status and network. The banner's show/hide and 5s/30s escalation are
  // driven by NetworkConnectionBannerController, which re-saves the failing
  // network on every re-evaluation (e.g. to pick up an RPC URL edit). That
  // changes the `network` reference without the banner actually reappearing, so
  // dedupe on a stable key to avoid double counting.
  const lastShownKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if ((status === 'degraded' || status === 'unavailable') && network) {
      const shownKey = `${status}:${network.networkClientId}`;
      if (lastShownKeyRef.current === shownKey) {
        return;
      }
      lastShownKeyRef.current = shownKey;

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
    } else {
      lastShownKeyRef.current = null;
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
    isSlowNetwork,
    dismissSlowNetwork,
    updateRpc,
    switchToInfura,
  };
};

export default useNetworkConnectionBanner;
