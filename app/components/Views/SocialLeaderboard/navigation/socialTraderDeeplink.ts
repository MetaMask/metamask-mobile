import { Platform } from 'react-native';
import branch from 'react-native-branch';
import Share from 'react-native-share';
import { ACTIONS, PROTOCOLS } from '../../../../constants/deeplinks';
import AppConstants from '../../../../core/AppConstants';
import {
  SOCIAL_PROFILE_POSITION_SUBPATH,
  SOCIAL_PROFILE_SUBPATH,
} from '../../../../core/DeeplinkManager/util/deeplinks/socialDeeplinkPath';
import Logger from '../../../../util/Logger';
import {
  createSocialOgImage,
  getSocialOgDefaultImageUrl,
  type SocialOgImageRequest,
} from './socialOgImageService';
import { logSocialOgShare } from './socialOgShareLog';
import {
  resolveSocialSharePromoCode,
  withSocialSharePromoCode,
} from './socialSharePromoCode';
import type { SocialLinkOpenGraph } from './socialShareOpenGraph';

const SHORT_LINK_TIMEOUT_MS = 8000;
const OG_IMAGE_TIMEOUT_MS = 6000;
const PROFILE_DEEPLINK_PATH = `${ACTIONS.SOCIAL}/${SOCIAL_PROFILE_SUBPATH}`;
const POSITION_DEEPLINK_PATH = `${ACTIONS.SOCIAL}/${SOCIAL_PROFILE_POSITION_SUBPATH}`;
type SocialShareLinkMode = 'long' | 'branch-short';

/**
 * Branch short links, with the preview set through the SDK. Switch back to
 * `long` (preview data in the query string) if short links lose the
 * per-link image again.
 */
// Asserted, not annotated: an annotated `const` narrows to one literal, and
// tsc then rejects the comparison with the other mode as having no overlap.
export const SOCIAL_SHARE_LINK_MODE = 'branch-short' as SocialShareLinkMode;

/**
 * A later share replaces an in-flight one. An older card or link result must
 * not open a sheet after the user has already asked for something else.
 */
let shareGeneration = 0;
let activeShareAbort: AbortController | undefined;

/** Share-time values the card body gets from the share flow, not the screen. */
export interface SocialShareCardContext {
  /** The sharer's referral code. Absent when they have none. */
  promoCode?: string;
}

/**
 * Builds the card body only once the user has tapped share. Resolve to
 * `undefined` when the screen lacks a required field; the generic card is
 * rendered instead.
 */
export type BuildSocialOgImageRequest = (
  context: SocialShareCardContext,
) => Promise<SocialOgImageRequest | undefined>;

/**
 * Universal link for a trader profile. The same URL opens Social V0 or V1
 * from `socialAiTSA1122AbtestSocialBundleV1`.
 *
 * This is the navigation URL. Preview metadata is added later according to
 * `SOCIAL_SHARE_LINK_MODE`.
 */
export const buildSocialTraderDeeplink = (traderId: string): string => {
  const url = new URL(
    `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${PROFILE_DEEPLINK_PATH}`,
  );
  url.searchParams.set('traderId', traderId);
  return url.toString();
};

/** The link, in exactly one of `message` or `url`. */
export type SocialShareContent = { message: string } | { url: string };

/**
 * `react-native-share` hands iOS `message` and `url` as separate items, so
 * passing both shares the link twice. iOS gets `url`, which keeps the link
 * preview and still works with Copy. Android shares `message` as the text.
 */
const toShareContent = (
  sharedUrl: string,
  os: typeof Platform.OS,
): SocialShareContent =>
  os === 'ios' ? { url: sharedUrl } : { message: sharedUrl };

/**
 * Universal link for a trader position. The same URL opens the shared
 * position screen, with V1 chrome when the Social bundle experiment is on.
 */
export const buildSocialTraderPositionDeeplink = (
  positionId: string,
  traderId: string,
): string => {
  const url = new URL(
    `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${POSITION_DEEPLINK_PATH}`,
  );
  url.searchParams.set('positionId', positionId);
  url.searchParams.set('traderId', traderId);
  return url.toString();
};

/**
 * Share payload for a trader profile. iOS shares the URL as `url`; Android
 * shares it as the message text.
 */
export const buildSocialTraderShareContent = (
  traderId: string,
  os: typeof Platform.OS = Platform.OS,
): SocialShareContent =>
  toShareContent(buildSocialTraderDeeplink(traderId), os);

/**
 * Share payload for a trader position. Same iOS / Android split as a profile.
 */
export const buildSocialTraderPositionShareContent = (
  positionId: string,
  traderId: string,
  os: typeof Platform.OS = Platform.OS,
): SocialShareContent =>
  toShareContent(buildSocialTraderPositionDeeplink(positionId, traderId), os);

/**
 * Adds preview metadata directly to a Branch long link. Branch maps
 * `$og_image_url` to both the Open Graph and Twitter image tags for these
 * links, while the explicit Twitter copy avoids account-level defaults.
 */
export const buildSocialLongShareUrl = (
  canonicalUrl: string,
  openGraph?: SocialLinkOpenGraph,
): string => {
  if (!openGraph) {
    return canonicalUrl;
  }

  const url = new URL(canonicalUrl);
  url.searchParams.set('$og_title', openGraph.title);
  url.searchParams.set('$og_description', openGraph.description);
  if (openGraph.imageUrl) {
    url.searchParams.set('$og_image_url', openGraph.imageUrl);
  }
  url.searchParams.set('$twitter_card', 'summary_large_image');
  url.searchParams.set('$twitter_title', openGraph.title);
  url.searchParams.set('$twitter_description', openGraph.description);
  return url.toString();
};

/** Query parameter marking a link as one the user shared from the app. */
export const SOCIAL_SHARE_MARKER_PARAM = 'share';

/**
 * Adds `share=1` to the link handed to the share sheet: the Branch short link
 * it got back, or the long / canonical link. It is never part of what is sent
 * to Branch, so the short link itself stays the same.
 */
export const withSocialShareMarker = (sharedUrl: string): string => {
  try {
    const url = new URL(sharedUrl);
    url.searchParams.set(SOCIAL_SHARE_MARKER_PARAM, '1');
    return url.toString();
  } catch {
    return sharedUrl;
  }
};

const isHttpsUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const withTimeout = <T>(work: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Branch short link timed out')),
      timeoutMs,
    );
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });

/**
 * Asks Branch for a short link whose preview uses the universal object's
 * title, description, and image. Those fields are what the SDK stores as
 * `$og_title`, `$og_description`, and `$og_image_url`.
 *
 * A short link is shorter than a URL with those fields in the query. It does
 * not prove the preview is authentic: the public Branch key can create other
 * links on the same domain. Callers fall back to `canonicalUrl` when Branch
 * returns nothing usable.
 */
export const createSocialBranchShortUrl = async (
  canonicalUrl: string,
  deeplinkPath: string,
  openGraph?: SocialLinkOpenGraph,
  timeoutMs: number = SHORT_LINK_TIMEOUT_MS,
): Promise<string> => {
  type CreatedObject = Awaited<
    ReturnType<typeof branch.createBranchUniversalObject>
  >;
  let universalObject: CreatedObject | undefined;
  // No `canonicalUrl` here and no `$fallback_url` / `$desktop_url` below:
  // given a web URL, Branch scrapes that page's meta tags for the preview, and
  // the plain `link.metamask.io` URL carries the account's default image,
  // which replaced the card set in `contentImageUrl` (`$og_image_url`).
  // Desktop clicks follow the dashboard's default desktop redirect instead.
  const universalObjectOptions = {
    locallyIndex: false,
    publiclyIndex: false,
    title: openGraph?.title,
    contentDescription: openGraph?.description,
    contentImageUrl: openGraph?.imageUrl,
  };
  const linkProperties = { feature: 'share', channel: 'social' };
  // These Branch link-data keys are not listed by the RN control-param type.
  // The dashboard defaults otherwise fill the Twitter tags. In particular,
  // `$twitter_image_url` did not override `twitter:image:src` in the generated
  // page, so use Branch's custom-meta-tag escape hatch for the image.
  const controlParams = {
    $deeplink_path: deeplinkPath,
    ...(openGraph
      ? {
          $twitter_card: 'summary_large_image',
          $twitter_title: openGraph.title,
          $twitter_description: openGraph.description,
          ...(openGraph.imageUrl
            ? {
                $custom_meta_tags: JSON.stringify({
                  'twitter:image': openGraph.imageUrl,
                  'twitter:image:src': openGraph.imageUrl,
                }),
              }
            : {}),
        }
      : {}),
  };
  logSocialOgShare('Branch createBranchUniversalObject input', {
    identifier: deeplinkPath,
    options: universalObjectOptions,
  });
  logSocialOgShare('Branch generateShortUrl input', {
    linkProperties,
    controlParams,
    timeoutMs,
  });

  const pending = (async () => {
    const created = await branch.createBranchUniversalObject(
      deeplinkPath,
      universalObjectOptions,
    );
    universalObject = created;
    logSocialOgShare('Branch universal object created', {
      ident: created.ident,
    });
    const { url } = await created.generateShortUrl(
      linkProperties,
      controlParams as Parameters<CreatedObject['generateShortUrl']>[1],
    );
    logSocialOgShare('Branch generateShortUrl returned', { url });
    return url;
  })();

  try {
    const shortUrl = await withTimeout(pending, timeoutMs);
    if (isHttpsUrl(shortUrl)) {
      logSocialOgShare('Using Branch short link', { shortUrl });
      return shortUrl;
    }
    logSocialOgShare(
      'Branch returned a non-https url; using the canonical url',
      { shortUrl, canonicalUrl },
    );
    return canonicalUrl;
  } catch (error) {
    logSocialOgShare('Branch short link failed; using the canonical url', {
      error: error instanceof Error ? error.message : String(error),
      canonicalUrl,
    });
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'Social share Branch short link failed',
    );
    return canonicalUrl;
  } finally {
    pending
      .then(
        () => universalObject?.release(),
        () => universalObject?.release(),
      )
      .catch(() => undefined);
  }
};

/**
 * Whether the native sheet completed a share.
 *
 * React Native `Share.share` resolves with `sharedAction` on Android both when
 * the user shares and when they dismiss, so it cannot gate `post_shared`.
 * `react-native-share` with `failOnCancel: false` reports a real share as
 * `success: true` and a dismiss as `success: false` / `dismissedAction`.
 */
const didCompleteNativeShare = (result: {
  success?: boolean;
  dismissedAction?: boolean;
}): boolean => result.success === true && result.dismissedAction !== true;

const openShareSheet = (
  content: SocialShareContent,
  onShared?: () => void,
): void => {
  logSocialOgShare('Opening share sheet', content);
  Share.open({
    ...content,
    failOnCancel: false,
  })
    .then((result) => {
      const completed = didCompleteNativeShare(result);
      logSocialOgShare('Share sheet closed', { result, completed });
      if (completed) {
        onShared?.();
      }
    })
    .catch((error: unknown) => {
      logSocialOgShare('Share sheet failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
};

/**
 * Image URL for a share preview: a card rendered by `POST /api/v1/og-images`,
 * or the API's static default card when building or rendering the card
 * fails, times out, or is aborted. Never rejects.
 */
export const resolveSocialShareImageUrl = async (
  buildRequest: BuildSocialOgImageRequest,
  signal?: AbortSignal,
  timeoutMs: number = OG_IMAGE_TIMEOUT_MS,
  context: SocialShareCardContext = {},
): Promise<string> => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  logSocialOgShare('Resolving card image', { timeoutMs });
  try {
    const work = (async () => {
      const built = await buildRequest(context);
      const request = built ?? { kind: 'generic' as const };
      logSocialOgShare(
        built
          ? 'Card request built'
          : 'Screen could not fill a card; requesting the generic card',
        request,
      );
      return createSocialOgImage(request, controller.signal);
    })();
    const imageUrl = await withTimeout(work, timeoutMs);
    logSocialOgShare('Card image resolved', { imageUrl });
    return imageUrl;
  } catch (error) {
    controller.abort();
    const defaultImageUrl = getSocialOgDefaultImageUrl();
    logSocialOgShare(
      signal?.aborted
        ? 'Card request aborted by a newer share; using the default card'
        : 'Card request failed; using the default card',
      {
        error: error instanceof Error ? error.message : String(error),
        defaultImageUrl,
      },
    );
    if (!signal?.aborted) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'Social share og-image request failed',
      );
    }
    return defaultImageUrl;
  } finally {
    signal?.removeEventListener('abort', abort);
  }
};

/**
 * Branch `$deeplink_path` for a share: the canonical link's path and query
 * (`social/profile?traderId=…`). A short link has no query of its own, so
 * `rewriteBranchUri` reads the route's ids from here when the link opens.
 */
export const toSocialBranchDeeplinkPath = (canonicalUrl: string): string => {
  const url = new URL(canonicalUrl);
  return `${url.pathname.replace(/^\//, '')}${url.search}`;
};

const shareLink = (
  routeUrl: string,
  openGraph: SocialLinkOpenGraph | undefined,
  onShared?: () => void,
  buildOgImageRequest?: BuildSocialOgImageRequest,
): Promise<void> => {
  const generation = ++shareGeneration;
  activeShareAbort?.abort();
  const controller = new AbortController();
  activeShareAbort = controller;
  const isCurrent = () => generation === shareGeneration;
  logSocialOgShare('Share started', {
    generation,
    routeUrl,
    linkMode: SOCIAL_SHARE_LINK_MODE,
    openGraph,
    hasCardBuilder: Boolean(buildOgImageRequest),
  });

  return (async () => {
    const promoCode = await resolveSocialSharePromoCode();
    if (!isCurrent()) {
      logSocialOgShare('Share superseded after the promo code step', {
        generation,
      });
      return;
    }
    const canonicalUrl = withSocialSharePromoCode(routeUrl, promoCode);
    const deeplinkPath = toSocialBranchDeeplinkPath(canonicalUrl);
    let preview = openGraph;
    if (openGraph && buildOgImageRequest) {
      const imageUrl = await resolveSocialShareImageUrl(
        buildOgImageRequest,
        controller.signal,
        undefined,
        { promoCode },
      );
      if (!isCurrent()) {
        logSocialOgShare('Share superseded after the card step', {
          generation,
        });
        return;
      }
      preview = { ...openGraph, imageUrl };
    } else if (!openGraph) {
      logSocialOgShare('No preview copy (missing trader name); skipping card', {
        generation,
      });
    }
    logSocialOgShare('Preview ready for link generation', {
      generation,
      canonicalUrl,
      deeplinkPath,
      linkMode: SOCIAL_SHARE_LINK_MODE,
      preview,
    });
    const sharedUrl = withSocialShareMarker(
      SOCIAL_SHARE_LINK_MODE === 'branch-short'
        ? await createSocialBranchShortUrl(canonicalUrl, deeplinkPath, preview)
        : buildSocialLongShareUrl(canonicalUrl, preview),
    );
    logSocialOgShare('Share link generated', {
      generation,
      linkMode: SOCIAL_SHARE_LINK_MODE,
      sharedUrl,
    });
    if (!isCurrent()) {
      logSocialOgShare('Share superseded after link generation', {
        generation,
        sharedUrl,
      });
      return;
    }
    openShareSheet(toShareContent(sharedUrl, Platform.OS), onShared);
  })().catch((error: unknown) => {
    logSocialOgShare('Share flow threw', {
      generation,
      error: error instanceof Error ? error.message : String(error),
    });
  });
};

/**
 * Opens the native share sheet with the configured link type for the profile.
 * Pass `buildOgImageRequest` to use a server-rendered card as the preview
 * image instead of the brand image on `openGraph`.
 *
 * Resolves once the share sheet opens, or when the share ends without one
 * (a newer share replaced it, or it failed). Never rejects. Use it to show
 * progress while the card renders and the link is created.
 */
export const shareSocialProfile = (
  traderId: string,
  onShared?: () => void,
  openGraph?: SocialLinkOpenGraph,
  buildOgImageRequest?: BuildSocialOgImageRequest,
): Promise<void> =>
  shareLink(
    buildSocialTraderDeeplink(traderId),
    openGraph,
    onShared,
    buildOgImageRequest,
  );

/**
 * Opens the native share sheet with the configured link type for the position.
 * Pass `buildOgImageRequest` to use a server-rendered card as the preview
 * image instead of the brand image on `openGraph`.
 *
 * Resolves once the share sheet opens, or when the share ends without one.
 * Never rejects. See {@link shareSocialProfile}.
 */
export const shareSocialTraderPosition = (
  positionId: string,
  traderId: string,
  onShared?: () => void,
  openGraph?: SocialLinkOpenGraph,
  buildOgImageRequest?: BuildSocialOgImageRequest,
): Promise<void> =>
  shareLink(
    buildSocialTraderPositionDeeplink(positionId, traderId),
    openGraph,
    onShared,
    buildOgImageRequest,
  );
