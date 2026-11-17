import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { hexToNumber } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { AppState } from 'react-native';
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
import { AppStateEventProcessor } from '../../../core/AppStateEventListener';
import { isPublicEndpointUrl } from '../../../core/Engine/controllers/network-controller/utils';
import onlyKeepHost from '../../../util/onlyKeepHost';
import { INFURA_PROJECT_ID } from '../../../constants/network';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useSettledNetworkLatency } from '../../../hooks/useNetworkLatency';
import StorageWrapper from '../../../store/storage-wrapper';
import { SLOW_NETWORK_BANNER_DISMISSED_AT } from '../../../constants/storage';
import { selectSlowNetworkBannerEnabled } from '../../../selectors/featureFlagController/slowNetworkBanner';
import {
  getHardwareTier,
  getNetworkTierSnapshot,
} from '../../../util/deviceCapability';

const infuraProjectId = INFURA_PROJECT_ID ?? '';

export const SLOW_NETWORK_BANNER_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
function sanitizeRpcUrl(rpcUrl: string) {
  return isPublicEndpointUrl(rpcUrl, infuraProjectId)
    ? onlyKeepHost(rpcUrl)
    : 'custom';
}

function getStoredDismissedAt(): number {
  return (
    Number(StorageWrapper.getItemSync(SLOW_NETWORK_BANNER_DISMISSED_AT)) || 0
  );
}

function isSnoozed(dismissedAt: number): boolean {
  const elapsedMs = Date.now() - dismissedAt;
  // A negative elapsed time means the clock was ahead when the user dismissed.
  return (
    dismissedAt > 0 &&
    elapsedMs >= 0 &&
    elapsedMs < SLOW_NETWORK_BANNER_SNOOZE_MS
  );
}

interface SlowBannerEpisode {
  visibleMs: number;
  visibleSince: number | null;
}

function takeVisibleDurationMs(episodeRef: {
  current: SlowBannerEpisode | null;
}): number | null {
  const episode = episodeRef.current;
  episodeRef.current = null;
  if (!episode) {
    return null;
  }
  const openStretchMs =
    episode.visibleSince === null ? 0 : Date.now() - episode.visibleSince;
  return episode.visibleMs + openStretchMs;
}

const useNetworkConnectionBanner = (): {
  status: NetworkConnectionBannerStatus;
  network: FailedNetwork | null;
  /** True when either the RPC banner or the slow network banner shows. */
  isVisible: boolean;
  /** True when requests are slow, unless "Unable to connect" shows or it was dismissed this week. */
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
  const settledLatency = useSettledNetworkLatency();
  const isLatencySlow = settledLatency === 'SLOW';
  const [isAppInBackground, setIsAppInBackground] = useState(
    () => AppState.currentState === 'background',
  );
  // Covers a dismissal whose storage write did not land.
  const dismissedAtRef = useRef(0);
  const [isSlowNetworkSnoozed, setIsSlowNetworkSnoozed] = useState(() =>
    isSnoozed(getStoredDismissedAt()),
  );
  const slowEpisodeRef = useRef<SlowBannerEpisode | null>(null);

  const trackSlowNetworkEvent = useCallback(
    (
      event: IMetaMetricsEvent,
      properties: Record<string, string | number | boolean>,
    ) => {
      trackEvent(
        createEventBuilder(event)
          .addProperties({
            banner_type: 'slow',
            hardware_tier: getHardwareTier() ?? 'UNKNOWN',
            network_tier: getNetworkTierSnapshot() ?? 'UNKNOWN',
            ...properties,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setIsAppInBackground(next === 'background');
    });
    return (): void => subscription.remove();
  }, []);

  // The settled reading survives resume, so the snooze must also be re-read on return to foreground.
  useEffect(() => {
    if (!isLatencySlow || isAppInBackground) {
      return;
    }
    setIsSlowNetworkSnoozed(
      isSnoozed(Math.max(getStoredDismissedAt(), dismissedAtRef.current)),
    );
  }, [isLatencySlow, isAppInBackground]);

  // Must run before the visibility effect so a closed episode is not paused.
  // `UNKNOWN` (offline) only hides the banner, so it is not counted as a recovery.
  useEffect(() => {
    if (settledLatency !== 'OK') {
      return;
    }
    const visibleDurationMs = takeVisibleDurationMs(slowEpisodeRef);
    if (visibleDurationMs !== null) {
      trackSlowNetworkEvent(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_CLEARED,
        { visible_duration_ms: visibleDurationMs },
      );
    }
  }, [settledLatency, trackSlowNetworkEvent]);

  // Priority: "Unable to connect", then "Slow connection", then "Still connecting".
  const isRpcUnavailable = status === 'unavailable' && Boolean(network);
  const isSlowNetwork =
    isSlowNetworkBannerEnabled &&
    !isRpcUnavailable &&
    isLatencySlow &&
    !isSlowNetworkSnoozed;
  const isRpcFailing =
    (status === 'degraded' || status === 'unavailable') && Boolean(network);
  const isRpcBannerVisible = !isSlowNetwork && isRpcFailing;

  // The settled reading survives background, so background time must pause the episode too.
  const isSlowBannerOnScreen = isSlowNetwork && !isAppInBackground;

  // One Shown per slow episode, even if another banner hides this one for a while.
  useEffect(() => {
    const episode = slowEpisodeRef.current;
    const now = Date.now();
    if (!isSlowBannerOnScreen) {
      if (episode && episode.visibleSince !== null) {
        episode.visibleMs += now - episode.visibleSince;
        episode.visibleSince = null;
      }
      return;
    }
    if (episode) {
      episode.visibleSince ??= now;
      return;
    }
    slowEpisodeRef.current = { visibleMs: 0, visibleSince: now };
    trackSlowNetworkEvent(MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN, {
      rpc_status: status,
      seconds_since_app_open: Math.round(
        (now - AppStateEventProcessor.getOpenedAt()) / 1000,
      ),
      previously_dismissed:
        Math.max(getStoredDismissedAt(), dismissedAtRef.current) > 0,
    });
  }, [isSlowBannerOnScreen, status, trackSlowNetworkEvent]);

  const dismissSlowNetwork = useCallback(() => {
    const visibleDurationMs = takeVisibleDurationMs(slowEpisodeRef);
    if (visibleDurationMs !== null) {
      trackSlowNetworkEvent(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_DISMISSED,
        { visible_duration_ms: visibleDurationMs },
      );
    }
    const dismissedAt = Date.now();
    dismissedAtRef.current = dismissedAt;
    setIsSlowNetworkSnoozed(true);
    StorageWrapper.setItem(
      SLOW_NETWORK_BANNER_DISMISSED_AT,
      String(dismissedAt),
    ).catch(() => undefined);
  }, [trackSlowNetworkEvent]);

  // Fire the "shown" analytics once per status and network, even while the
  // slow banner hides this one. The banner's show/hide and 5s/30s escalation are
  // driven by NetworkConnectionBannerController, which re-saves the failing
  // network on every re-evaluation (e.g. to pick up an RPC URL edit). That
  // changes the `network` reference without the banner actually reappearing, so
  // dedupe on a stable key to avoid double counting.
  const lastShownKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isRpcFailing || !network) {
      lastShownKeyRef.current = null;
      return;
    }
    if (!isRpcBannerVisible) {
      return;
    }
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
  }, [
    isRpcFailing,
    isRpcBannerVisible,
    status,
    network,
    trackEvent,
    createEventBuilder,
  ]);

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
