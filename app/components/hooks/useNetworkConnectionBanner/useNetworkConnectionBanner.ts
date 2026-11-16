import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { hexToNumber } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
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
import {
  MetaMetricsEvents,
  type IMetaMetricsEvent,
} from '../../../core/Analytics';
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
import { selectSlowNetworkBannerEnabled } from '../../../selectors/featureFlagController/slowNetworkBanner';
import { getHardwareTier } from '../../../util/deviceCapability';
import {
  computeNetworkTier,
  readCellularGeneration,
} from '../../../util/deviceCapability/computeNetworkTier';
import type { NetworkTier } from '../../../util/deviceCapability/types';

const infuraProjectId = INFURA_PROJECT_ID ?? '';

export const SLOW_NETWORK_BANNER_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
function sanitizeRpcUrl(rpcUrl: string) {
  return isPublicEndpointUrl(rpcUrl, infuraProjectId)
    ? onlyKeepHost(rpcUrl)
    : 'custom';
}

function getSlowNetworkBannerDismissedAt(): number {
  return Number(StorageWrapper.getItemSync(SLOW_NETWORK_BANNER_DISMISSED_AT));
}

function isSlowNetworkBannerSnoozed(): boolean {
  const dismissedAt = getSlowNetworkBannerDismissedAt();
  const elapsedMs = Date.now() - dismissedAt;
  // A negative elapsed time means the clock was ahead when the user dismissed.
  return (
    dismissedAt > 0 &&
    elapsedMs >= 0 &&
    elapsedMs < SLOW_NETWORK_BANNER_SNOOZE_MS
  );
}

/** Time on screen since `shownAtRef` was set, or `null` if not shown. Resets the ref. */
function takeVisibleDurationMs(shownAtRef: {
  current: number | null;
}): number | null {
  const shownAt = shownAtRef.current;
  shownAtRef.current = null;
  return shownAt === null ? null : Date.now() - shownAt;
}

async function readNetworkTier(): Promise<NetworkTier | null> {
  try {
    const { type, details, isInternetReachable } = await NetInfo.fetch();
    return computeNetworkTier({
      type,
      cellularGeneration: readCellularGeneration(details),
      isInternetReachable,
    });
  } catch {
    return null;
  }
}

const useNetworkConnectionBanner = (): {
  status: NetworkConnectionBannerStatus;
  network: FailedNetwork | null;
  /** True when either the RPC banner or the slow network banner shows. */
  isVisible: boolean;
  /**
   * True when requests are slow across the board. Shows ahead of "Still
   * connecting" but behind "Unable to connect". Hidden for a week after the
   * user dismisses it.
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
  const isSlowNetworkBannerEnabled = useSelector(
    selectSlowNetworkBannerEnabled,
  );
  const latency = useNetworkLatency();
  const [isLatencySlow, setIsLatencySlow] = useState(latency === 'SLOW');
  const [isSlowNetworkSnoozed, setIsSlowNetworkSnoozed] = useState(
    isSlowNetworkBannerSnoozed,
  );

  // Set while the slow network banner is on screen, for `visible_duration_ms`.
  const slowNetworkShownAtRef = useRef<number | null>(null);

  // The tiers are read only when an event fires, so tracking adds no
  // subscriptions or re-renders.
  const trackSlowNetworkEvent = useCallback(
    (
      event: IMetaMetricsEvent,
      properties: Record<string, string | number | boolean>,
    ) => {
      readNetworkTier()
        .then((networkTier) => {
          trackEvent(
            createEventBuilder(event)
              .addProperties({
                banner_type: 'slow',
                hardware_tier: getHardwareTier() ?? 'UNKNOWN',
                network_tier: networkTier ?? 'UNKNOWN',
                ...properties,
              })
              .build(),
          );
        })
        .catch(() => undefined);
    },
    [trackEvent, createEventBuilder],
  );

  // Latency resets to `UNKNOWN` on every app resume and network switch, so
  // only a fresh `OK` reading hides the banner. Re-reading the snooze here lets
  // it expire mid-session.
  useEffect(() => {
    if (latency === 'SLOW') {
      setIsLatencySlow(true);
      setIsSlowNetworkSnoozed(isSlowNetworkBannerSnoozed());
    } else if (latency === 'OK') {
      const visibleDurationMs = takeVisibleDurationMs(slowNetworkShownAtRef);
      if (visibleDurationMs !== null) {
        trackSlowNetworkEvent(
          MetaMetricsEvents.NETWORK_CONNECTION_BANNER_CLEARED,
          { visible_duration_ms: visibleDurationMs },
        );
      }
      setIsLatencySlow(false);
    }
  }, [latency, trackSlowNetworkEvent]);

  // Priority: "Unable to connect", then "Slow connection", then "Still connecting".
  const isRpcUnavailable = status === 'unavailable' && Boolean(network);
  const isSlowNetwork =
    isSlowNetworkBannerEnabled &&
    !isRpcUnavailable &&
    isLatencySlow &&
    !isSlowNetworkSnoozed;
  const isRpcBannerVisible =
    !isSlowNetwork &&
    (status === 'degraded' || status === 'unavailable') &&
    Boolean(network);

  useEffect(() => {
    if (!isSlowNetwork) {
      slowNetworkShownAtRef.current = null;
      return;
    }
    if (slowNetworkShownAtRef.current !== null) {
      return;
    }
    slowNetworkShownAtRef.current = Date.now();
    trackSlowNetworkEvent(MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN, {
      rpc_status: status,
      seconds_since_app_open: Math.round(performance.now() / 1000),
      previously_dismissed: getSlowNetworkBannerDismissedAt() > 0,
    });
  }, [isSlowNetwork, status, trackSlowNetworkEvent]);

  const dismissSlowNetwork = useCallback(() => {
    const visibleDurationMs = takeVisibleDurationMs(slowNetworkShownAtRef);
    if (visibleDurationMs !== null) {
      trackSlowNetworkEvent(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_DISMISSED,
        { visible_duration_ms: visibleDurationMs },
      );
    }
    setIsSlowNetworkSnoozed(true);
    StorageWrapper.setItem(
      SLOW_NETWORK_BANNER_DISMISSED_AT,
      String(Date.now()),
    ).catch(() => undefined);
  }, [trackSlowNetworkEvent]);

  // Fire the "shown" analytics once each time the banner becomes visible for a
  // given status and network. The banner's show/hide and 5s/30s escalation are
  // driven by NetworkConnectionBannerController, which re-saves the failing
  // network on every re-evaluation (e.g. to pick up an RPC URL edit). That
  // changes the `network` reference without the banner actually reappearing, so
  // dedupe on a stable key to avoid double counting.
  const lastShownKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (isRpcBannerVisible && network) {
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
  }, [isRpcBannerVisible, status, network, trackEvent, createEventBuilder]);

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
    isVisible: isRpcBannerVisible || isSlowNetwork,
    isSlowNetwork,
    dismissSlowNetwork,
    updateRpc,
    switchToInfura,
  };
};

export default useNetworkConnectionBanner;
