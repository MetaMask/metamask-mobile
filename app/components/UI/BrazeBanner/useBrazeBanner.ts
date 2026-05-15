import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Braze, { Banner } from '@braze/react-native-sdk';
import { useDispatch, useSelector } from 'react-redux';
import {
  dismissBrazeBanner,
  getBannerForPlacement,
  refreshBrazeBanners,
} from '../../../core/Braze';
import { setLastDismissedBrazeBanner } from '../../../reducers/banners';
import { selectLastDismissedBrazeBanner } from '../../../selectors/banner';
import { SKELETON_TIMEOUT_MS } from './BrazeBanner.constants';
import {
  getRawStringOrImageProp,
  getRawStringProp,
} from './brazeBannerProperties';
export type BrazeBannerStatus = 'loading' | 'visible' | 'empty' | 'dismissed';

export interface UseBrazeBannerResult {
  status: BrazeBannerStatus;
  banner: Banner | null;
  bannerName: string | null;
  eventProperties: { [key: string]: unknown } | null;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  deeplink: string | null;
  dismiss: () => void;
}

/**
 * Braze dashboard property keys. Each key must be set on the campaign for
 * the corresponding feature to work.
 *
 * - `banner_id`    Cross-session dismissal persistence and impression tracking.
 * - `deeplink`     URL routed through the app's deeplink pipeline on tap.
 * - `title`        Optional bold heading above the body text.
 * - `body`         Main message text (required; banner is ignored without it).
 * - `image_url`    URL for the image displayed on the left of the card.
 * - `cta_label`    Call-to-action text shown below the body (only when no title).
 */
const PROP_BANNER_NAME = 'campaign_name';
const PROP_DEEPLINK = 'deeplink';
const PROP_TITLE = 'title';
const PROP_BODY = 'body';
const PROP_IMAGE_URL = 'image_url';
const PROP_CTA_LABEL = 'cta_label';
const PROP_VARIANT_NAME = 'variant_name';

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
 * - Persisted to Redux (and Braze notified) for all campaigns except test sends.
 * The persisted value is only used to suppress the banner on the next session's
 * first render, then cleared — so the banner can reappear if Braze serves it again.
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

  // Once a banner has been accepted and shown, lock it in for this session so
  // subsequent bannerCardsUpdated events don't swap its content.
  const shownRef = useRef(false);

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
      if (dismissedRef.current || shownRef.current) return;

      // null means no cached/available banner — stay in loading state and
      // wait for a bannerCardsUpdated event or the skeleton timeout.
      if (candidate === null) return;

      if (candidate.isControl || candidate.placementId !== placementId) {
        // Control-group assignment or no banner for this placement.
        clearNoResponseTimeout();
        setStatus('empty');
        return;
      }

      const body = getRawStringProp(candidate, PROP_BODY);
      if (!body) {
        return; // wait for a meaningful banner
      }

      const bannerName = getRawStringProp(candidate, PROP_BANNER_NAME);
      if (
        bannerName !== null &&
        bannerName === lastDismissedBrazeBannerRef.current
      ) {
        // This banner was explicitly dismissed last session - skip it.
        return;
      }

      clearNoResponseTimeout();
      shownRef.current = true;

      setBanner(candidate);
      setStatus('visible');
    },
    [placementId, clearNoResponseTimeout],
  );

  useEffect(() => {
    // Consume the stale-cache guard: the ref already holds the value for this
    // session, so clear storage now — the next session starts with no guard.
    if (lastDismissedBrazeBannerRef.current !== null) {
      dispatch(setLastDismissedBrazeBanner(null));
    }

    // Warm-cache probe: if the SDK already has a banner cached for this
    // placement (e.g. returning user), show it immediately without waiting for
    // the next `bannerCardsUpdated` event.
    getBannerForPlacement(placementId).then((result) => {
      handleBanner(result);
    });

    const subscription = Braze.addListener(
      'bannerCardsUpdated',
      (event: { banners: Banner[] }) => {
        if (dismissedRef.current || shownRef.current) return;

        const match = event.banners.find(
          (b) =>
            b.placementId === placementId && getRawStringProp(b, PROP_BODY),
        );

        if (match) {
          handleBanner(match);
        }
      },
    );

    // Refresh the SDK's banner cache when the app returns to the foreground so
    // that stale cached banners are replaced without changing the visible UI.
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          refreshBrazeBanners([placementId]);
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
      appStateSubscription.remove();
      clearNoResponseTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementId]);

  const bannerName = banner ? getRawStringProp(banner, PROP_BANNER_NAME) : null;
  const deeplink = banner ? getRawStringProp(banner, PROP_DEEPLINK) : null;
  const title = banner ? getRawStringProp(banner, PROP_TITLE) : null;
  const body = banner ? getRawStringProp(banner, PROP_BODY) : null;
  const imageUrl = banner
    ? getRawStringOrImageProp(banner, PROP_IMAGE_URL)
    : null;
  const ctaLabel = banner ? getRawStringProp(banner, PROP_CTA_LABEL) : null;
  const variantName = banner
    ? getRawStringProp(banner, PROP_VARIANT_NAME)
    : null;

  const eventProperties = useMemo(
    () =>
      bannerName
        ? {
            [PROP_BANNER_NAME]: bannerName,
            ...(variantName !== null && { [PROP_VARIANT_NAME]: variantName }),
          }
        : null,
    [bannerName, variantName],
  );

  const dismiss = useCallback(() => {
    // we don't dismiss again if it has already been dismissed
    if (!banner || dismissedRef.current) return;

    dismissedRef.current = true;
    setStatus('dismissed');

    // Persist the dismissal and notify Braze unless this is a test send.
    if (eventProperties && !banner.isTestSend) {
      dispatch(setLastDismissedBrazeBanner(bannerName));
      dismissBrazeBanner(eventProperties);
    }
  }, [banner, bannerName, eventProperties, dispatch]);

  return {
    status,
    banner,
    bannerName,
    eventProperties,
    title,
    body,
    imageUrl,
    ctaLabel,
    deeplink,
    dismiss,
  };
}
