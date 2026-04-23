import { useCallback, useEffect, useRef, useState } from 'react';
import Braze, { Banner } from '@braze/react-native-sdk';
import { useDispatch, useSelector } from 'react-redux';
import { dismissBrazeBanner, getBannerForPlacement } from '../../../core/Braze';
import { setLastDismissedBrazeBanner } from '../../../reducers/banners';
import { selectLastDismissedBrazeBanner } from '../../../selectors/banner';

/**
 * Safety-net timeout: if no `bannerCardsUpdated` event arrives within this
 * window (e.g. no active campaign for this placement), the skeleton is hidden.
 */
const SKELETON_TIMEOUT_MS = 5000;

/**
 * Maximum allowed byte length for a banner's HTML payload.
 * Banners exceeding this are treated as empty to prevent memory pressure from
 * malformed or unexpectedly large campaign creatives.
 */
const MAX_BANNER_HTML_BYTES = 256 * 1024; // 256 KB

export type BrazeBannerStatus = 'loading' | 'visible' | 'empty' | 'dismissed';

export interface UseBrazeBannerResult {
  status: BrazeBannerStatus;
  banner: Banner | null;
  deeplink: string | null;
  height: number | null;
  dismiss: () => void;
}

/**
 * Reads the underlying raw property map on `CampaignProperties` directly rather
 * than calling the SDK's `getStringProperty` / `getNumberProperty` helpers,
 * which were not working.
 */
type RawProperties = Record<string, { type?: string; value?: unknown }>;

function getRawProperties(banner: Banner): RawProperties | undefined {
  return banner.properties as unknown as RawProperties;
}

function getRawStringProp(banner: Banner, key: string): string | null {
  const prop = getRawProperties(banner)?.[key];
  return prop?.type === 'string' && typeof prop.value === 'string'
    ? prop.value
    : null;
}

function getRawNumberProp(banner: Banner, key: string): number | null {
  const prop = getRawProperties(banner)?.[key];
  return prop?.type === 'number' && typeof prop.value === 'number'
    ? prop.value
    : null;
}

/**
 * Braze dashboard property keys. Each key must be set on the campaign for
 * the corresponding feature to work.
 *
 * - `dismiss_id`  Cross-session dismissal persistence.
 * - `deeplink`    URL routed through the app's deeplink pipeline on tap.
 * - `height (optional)`      Banner height in logical pixels. Falls back to the default when absent.
 */
const PROP_DISMISS_ID = 'dismiss_id';
const PROP_DEEPLINK = 'deeplink';
const PROP_HEIGHT = 'height';

/**
 * Drives the BrazeBanner state machine.
 *
 * States: `loading → visible`, `loading → empty`, `visible → dismissed`.
 *
 * - `loading`   Skeleton shown; waiting for the first valid banner event.
 * - `visible`   A non-dismissed banner is ready to render.
 * - `empty`     No banner arrived within the timeout (or SDK returned empty).
 * - `dismissed` User dismissed this session; renders nothing until next mount.
 *
 * Dismissal behaviour:
 * - Always in-memory: hides immediately and stays hidden for the session.
 * - Persisted only when the campaign has a `dismiss_id` property set.
 */
export function useBrazeBanner(placementId: string): UseBrazeBannerResult {
  const dispatch = useDispatch();
  const [status, setStatus] = useState<BrazeBannerStatus>('loading');
  const [banner, setBanner] = useState<Banner | null>(null);

  const lastDismissedBrazeBanner = useSelector(selectLastDismissedBrazeBanner);
  const lastDismissedBrazeBannerRef = useRef(lastDismissedBrazeBanner);

  // In-memory dismissal flag. Once true, no future bannerCardsUpdated events
  // will change the status for the rest of this app session.
  const dismissedRef = useRef(false);

  // Skip events for a banner we've already accepted.
  const lastTrackingIdRef = useRef<string | null>(null);

  // Timeout to stop showing the loading skeleton and render nothing if no banner is available.
  const noResponseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearNoResponseTimeout = useCallback(() => {
    if (noResponseTimeoutRef.current) {
      clearTimeout(noResponseTimeoutRef.current);
      noResponseTimeoutRef.current = null;
    }
  }, []);

  /**
   * Evaluate a banner from any source (warm-cache probe or listener event).
   * Returns `true` if the banner was accepted and state updated.
   */
  const handleBanner = useCallback(
    (candidate: Banner | null) => {
      if (dismissedRef.current) return;

      if (candidate?.isControl || candidate?.placementId !== placementId) {
        // Control-group assignment or no banner for this placement.
        clearNoResponseTimeout();
        setStatus('empty');
        return;
      }

      if (!candidate.html) return;

      if (candidate.html.length > MAX_BANNER_HTML_BYTES) {
        clearNoResponseTimeout();
        setStatus('empty');
        return;
      }

      const dismissId = getRawStringProp(candidate, PROP_DISMISS_ID);
      if (
        dismissId !== null &&
        dismissId === lastDismissedBrazeBannerRef.current
      ) {
        // This banner was explicitly dismissed last session - skip it.
        clearNoResponseTimeout();
        setStatus('empty');
        return;
      }

      if (candidate.trackingId === lastTrackingIdRef.current) {
        // Duplicate event - no state update needed.
        return;
      }

      clearNoResponseTimeout();
      lastTrackingIdRef.current = candidate.trackingId;
      setBanner(candidate);
      setStatus('visible');
    },
    [placementId, clearNoResponseTimeout],
  );

  useEffect(() => {
    // Warm-cache probe: if the SDK already has a banner cached for this
    // placement (e.g. returning user), show it immediately without waiting for
    // the next `bannerCardsUpdated` event.
    getBannerForPlacement(placementId).then((result) => {
      handleBanner(result);
    });

    const subscription = Braze.addListener(
      'bannerCardsUpdated',
      (event: { banners: Banner[] }) => {
        if (dismissedRef.current) return;

        const match = event.banners.find(
          (b) => b.placementId === placementId && b.html,
        );

        if (match) {
          handleBanner(match);
        } else {
          // There is no banner for this placement right now.
          clearNoResponseTimeout();
          setStatus('empty');
        }
      },
    );

    // Fallback: if neither the warm-cache probe nor the SDK event resolves
    // within the window, stop showing the loading skeleton and render nothing.
    noResponseTimeoutRef.current = setTimeout(() => {
      if (!dismissedRef.current) {
        setStatus((prev) => (prev === 'loading' ? 'empty' : prev));
      }
    }, SKELETON_TIMEOUT_MS);

    return () => {
      subscription.remove();
      clearNoResponseTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementId]);

  const dismiss = useCallback(() => {
    if (!banner || dismissedRef.current) return;

    const dismissId = getRawStringProp(banner, PROP_DISMISS_ID);

    dismissedRef.current = true;
    setStatus('dismissed');

    // Send dismissal to braze and persist only when the campaign has an explicit dismiss_id;
    // otherwise the dismissal is session-only (nothing stored, nothing filtered at startup).
    if (dismissId !== null) {
      dispatch(setLastDismissedBrazeBanner(dismissId));
      dismissBrazeBanner(dismissId);
    }
  }, [banner, dispatch]);

  const deeplink = banner ? getRawStringProp(banner, PROP_DEEPLINK) : null;
  const height = banner ? getRawNumberProp(banner, PROP_HEIGHT) : null;

  return { status, banner, deeplink, height, dismiss };
}
