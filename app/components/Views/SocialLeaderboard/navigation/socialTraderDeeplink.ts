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
import type { SocialLinkOpenGraph } from './socialShareOpenGraph';

const SHORT_LINK_TIMEOUT_MS = 8000;
const OG_IMAGE_TIMEOUT_MS = 6000;
const PROFILE_DEEPLINK_PATH = `${ACTIONS.SOCIAL}/${SOCIAL_PROFILE_SUBPATH}`;
const POSITION_DEEPLINK_PATH = `${ACTIONS.SOCIAL}/${SOCIAL_PROFILE_POSITION_SUBPATH}`;

/**
 * A later share replaces an in-flight one. The older short-link result must
 * not open a sheet after the user has already asked for something else.
 */
let shareGeneration = 0;
let activeShareAbort: AbortController | undefined;

/**
 * Builds the card body only once the user has tapped share. Resolve to
 * `undefined` when the screen lacks a required field; the generic card is
 * rendered instead.
 */
export type BuildSocialOgImageRequest = () => Promise<
  SocialOgImageRequest | undefined
>;

/**
 * Universal link for a trader profile. The same URL opens Social V0 or V1
 * from `socialAiTSA1122AbtestSocialBundleV1`.
 *
 * This is the navigation URL. Preview text is not put on the query string;
 * a Branch short link carries that, and this URL is the fallback when Branch
 * does not return one.
 */
export const buildSocialTraderDeeplink = (traderId: string): string => {
  const url = new URL(
    `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${PROFILE_DEEPLINK_PATH}`,
  );
  url.searchParams.set('traderId', traderId);
  return url.toString();
};

/**
 * iOS `Share.share` gives other apps `url`, but the sheet's Copy action
 * copies `message` and ignores `url` when `message` is absent. The link has
 * to be in both fields. Android has no `url` field and shares `message`.
 */
const toShareContent = (
  sharedUrl: string,
  os: typeof Platform.OS,
): { message: string; url?: string } =>
  os === 'ios'
    ? { message: sharedUrl, url: sharedUrl }
    : { message: sharedUrl };

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
 * Share payload for a trader profile. iOS puts the URL in both `message`
 * and `url`; Android shares it as the message text.
 */
export const buildSocialTraderShareContent = (
  traderId: string,
  os: typeof Platform.OS = Platform.OS,
): { message: string; url?: string } =>
  toShareContent(buildSocialTraderDeeplink(traderId), os);

/**
 * Share payload for a trader position. Same iOS message/url split as a
 * profile, because both go through `Share.share`.
 */
export const buildSocialTraderPositionShareContent = (
  positionId: string,
  traderId: string,
  os: typeof Platform.OS = Platform.OS,
): { message: string; url?: string } =>
  toShareContent(buildSocialTraderPositionDeeplink(positionId, traderId), os);

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
  const pending = (async () => {
    const created = await branch.createBranchUniversalObject(deeplinkPath, {
      locallyIndex: false,
      publiclyIndex: false,
      canonicalUrl,
      title: openGraph?.title,
      contentDescription: openGraph?.description,
      contentImageUrl: openGraph?.imageUrl,
    });
    universalObject = created;
    // `$deeplink_path` is a Branch link-data key. The RN control-param type
    // does not list it, but the native SDK and our link rewriter both use it.
    const controlParams = {
      $deeplink_path: deeplinkPath,
      $fallback_url: canonicalUrl,
      $desktop_url: canonicalUrl,
    };
    const { url } = await created.generateShortUrl(
      { feature: 'share', channel: 'social' },
      controlParams as Parameters<CreatedObject['generateShortUrl']>[1],
    );
    return url;
  })();

  try {
    const shortUrl = await withTimeout(pending, timeoutMs);
    return isHttpsUrl(shortUrl) ? shortUrl : canonicalUrl;
  } catch (error) {
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
  content: { message: string; url?: string },
  onShared?: () => void,
): void => {
  Share.open({
    message: content.message,
    ...(content.url ? { url: content.url } : {}),
    failOnCancel: false,
  })
    .then((result) => {
      if (didCompleteNativeShare(result)) {
        onShared?.();
      }
    })
    .catch(() => undefined);
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
): Promise<string> => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  try {
    const work = (async () => {
      const request = (await buildRequest()) ?? { kind: 'generic' as const };
      return createSocialOgImage(request, controller.signal);
    })();
    return await withTimeout(work, timeoutMs);
  } catch (error) {
    controller.abort();
    if (!signal?.aborted) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'Social share og-image request failed',
      );
    }
    return getSocialOgDefaultImageUrl();
  } finally {
    signal?.removeEventListener('abort', abort);
  }
};

const shareLink = (
  canonicalUrl: string,
  deeplinkPath: string,
  openGraph: SocialLinkOpenGraph | undefined,
  onShared?: () => void,
  buildOgImageRequest?: BuildSocialOgImageRequest,
): void => {
  const generation = ++shareGeneration;
  activeShareAbort?.abort();
  const controller = new AbortController();
  activeShareAbort = controller;
  const isCurrent = () => generation === shareGeneration;

  (async () => {
    let preview = openGraph;
    if (openGraph && buildOgImageRequest) {
      const imageUrl = await resolveSocialShareImageUrl(
        buildOgImageRequest,
        controller.signal,
      );
      if (!isCurrent()) {
        return;
      }
      preview = { ...openGraph, imageUrl };
    }
    const sharedUrl = await createSocialBranchShortUrl(
      canonicalUrl,
      deeplinkPath,
      preview,
    );
    if (!isCurrent()) {
      return;
    }
    openShareSheet(toShareContent(sharedUrl, Platform.OS), onShared);
  })().catch(() => undefined);
};

/**
 * Opens the native share sheet with a Branch short link for the profile.
 * The canonical profile URL is shared when Branch does not return a link.
 * Pass `buildOgImageRequest` to use a server-rendered card as the preview
 * image instead of the brand image on `openGraph`.
 */
export const shareSocialProfile = (
  traderId: string,
  onShared?: () => void,
  openGraph?: SocialLinkOpenGraph,
  buildOgImageRequest?: BuildSocialOgImageRequest,
): void => {
  shareLink(
    buildSocialTraderDeeplink(traderId),
    PROFILE_DEEPLINK_PATH,
    openGraph,
    onShared,
    buildOgImageRequest,
  );
};

/**
 * Opens the native share sheet with a Branch short link for the position.
 * The canonical position URL is shared when Branch does not return a link.
 * Pass `buildOgImageRequest` to use a server-rendered card as the preview
 * image instead of the brand image on `openGraph`.
 */
export const shareSocialTraderPosition = (
  positionId: string,
  traderId: string,
  onShared?: () => void,
  openGraph?: SocialLinkOpenGraph,
  buildOgImageRequest?: BuildSocialOgImageRequest,
): void => {
  shareLink(
    buildSocialTraderPositionDeeplink(positionId, traderId),
    POSITION_DEEPLINK_PATH,
    openGraph,
    onShared,
    buildOgImageRequest,
  );
};
