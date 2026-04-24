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

export type BrazeBannerStatus = 'loading' | 'visible' | 'empty' | 'dismissed';

export interface UseBrazeBannerResult {
  status: BrazeBannerStatus;
  banner: Banner | null;
  bannerId: string | null;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  deeplink: string | null;
  dismiss: () => void;
}

/**
 * Reads the underlying raw property map on `CampaignProperties` directly rather
 * than calling the SDK's `getStringProperty` / `getNumberProperty` helpers,
 * which were not working.
 *
 * The Braze SDK occasionally nests the actual property entries one level deeper
 * under a `properties` key (i.e. `banner.properties.properties`). Both shapes
 * are checked so callers don't need to worry about the nesting level.
 */
type RawProperties = Record<string, { type?: string; value?: unknown }>;

/**
 * Resolves the active property map from a banner, then looks up `key` in it.
 * The SDK sometimes nests properties under `banner.properties.properties`; if
 * that sub-object exists it is used, otherwise `banner.properties` is used.
 */
function getRawProp(
  banner: Banner,
  key: string,
): { type?: string; value?: unknown } | undefined {
  const top = banner.properties as unknown as RawProperties;
  if (!top) return undefined;

  const nested = (top as unknown as { properties?: RawProperties }).properties;
  const props = nested && typeof nested === 'object' ? nested : top;

  return props[key];
}

function getRawStringProp(banner: Banner, key: string): string | null {
  const prop = getRawProp(banner, key);
  return prop?.type === 'string' && typeof prop.value === 'string'
    ? prop.value
    : null;
}

/**
 * Like `getRawStringProp` but also accepts `type: 'image'`, which Braze uses
 * for image-type campaign properties.
 */
function getRawStringOrImageProp(banner: Banner, key: string): string | null {
  const prop = getRawProp(banner, key);
  return (prop?.type === 'string' || prop?.type === 'image') &&
    typeof prop.value === 'string'
    ? prop.value
    : null;
}

function getRawBooleanProp(banner: Banner, key: string): boolean | null {
  const prop = getRawProp(banner, key);
  if (prop?.type === 'boolean') {
    if (typeof prop.value === 'boolean') return prop.value;
    if (prop.value === 'true') return true;
    if (prop.value === 'false') return false;
  }
  return null;
}

/**
 * Braze dashboard property keys. Each key must be set on the campaign for
 * the corresponding feature to work.
 *
 * - `banner_id`    Cross-session dismissal persistence and impression tracking.
 * - `dismissable`  When `true` (boolean), combined with `banner_id`, persists
 * the dismissal to Redux and notifies Braze. Without this flag the dismissal
 * is session-only.
 * - `deeplink`     URL routed through the app's deeplink pipeline on tap.
 * - `title`        Optional bold heading above the body text.
 * - `body`         Main message text (required; banner is ignored without it).
 * - `image_url`    URL for the image displayed on the left of the card.
 * - `cta_label`    Call-to-action text shown below the body (only when no title).
 */
const PROP_BANNER_ID = 'banner_id';
const PROP_DISMISSABLE = 'dismissable';
const PROP_DEEPLINK = 'deeplink';
const PROP_TITLE = 'title';
const PROP_BODY = 'body';
const PROP_IMAGE_URL = 'image_url';
const PROP_CTA_LABEL = 'cta_label';

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
 * - Persisted (Redux + Braze notification) only when the campaign sets both
 * `banner_id` and `dismissable: true`.
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

      const body = getRawStringProp(candidate, PROP_BODY);
      if (!body) {
        return; // wait for a meaningful banner
      }

      const bannerId = getRawStringProp(candidate, PROP_BANNER_ID);
      if (
        bannerId !== null &&
        bannerId === lastDismissedBrazeBannerRef.current
      ) {
        // This banner was explicitly dismissed last session - skip it.
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
          (b) =>
            b.placementId === placementId && getRawStringProp(b, PROP_BODY),
        );

        if (match) {
          handleBanner(match);
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

    const bannerId = getRawStringProp(banner, PROP_BANNER_ID);
    const dismissable = getRawBooleanProp(banner, PROP_DISMISSABLE);

    dismissedRef.current = true;
    setStatus('dismissed');

    // Persist the dismissal and notify Braze only when the campaign explicitly
    // sets both `banner_id` and `dismissable: true`. Without both flags the
    // dismissal is session-only (nothing stored, nothing filtered at startup).
    if (bannerId !== null && dismissable === true) {
      dispatch(setLastDismissedBrazeBanner(bannerId));
      dismissBrazeBanner(bannerId);
    }
  }, [banner, dispatch]);

  const bannerId = banner ? getRawStringProp(banner, PROP_BANNER_ID) : null;
  const deeplink = banner ? getRawStringProp(banner, PROP_DEEPLINK) : null;
  const title = banner ? getRawStringProp(banner, PROP_TITLE) : null;
  const body = banner ? getRawStringProp(banner, PROP_BODY) : null;
  const imageUrl = banner
    ? getRawStringOrImageProp(banner, PROP_IMAGE_URL)
    : null;
  const ctaLabel = banner ? getRawStringProp(banner, PROP_CTA_LABEL) : null;

  return {
    status,
    banner,
    bannerId,
    title,
    body,
    imageUrl,
    ctaLabel,
    deeplink,
    dismiss,
  };
}
