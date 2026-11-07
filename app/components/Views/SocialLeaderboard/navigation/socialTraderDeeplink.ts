import { Platform } from 'react-native';
import Share from 'react-native-share';
import { ACTIONS, PROTOCOLS } from '../../../../constants/deeplinks';
import AppConstants from '../../../../core/AppConstants';
import {
  SOCIAL_PROFILE_POSITION_SUBPATH,
  SOCIAL_PROFILE_SUBPATH,
} from '../../../../core/DeeplinkManager/util/deeplinks/socialDeeplinkPath';
import type { SocialLinkOpenGraph } from './socialShareOpenGraph';

/** Branch reads these query keys as dynamic open-graph tags. */
const OPEN_GRAPH_TITLE_PARAM = '$og_title';
const OPEN_GRAPH_DESCRIPTION_PARAM = '$og_description';
const MAX_OPEN_GRAPH_TITLE_LENGTH = 60;
const MAX_OPEN_GRAPH_DESCRIPTION_LENGTH = 90;

/**
 * Keeps a preview string short enough that the shared URL stays compact.
 * Cuts on a word boundary when the text has one.
 */
const compactOpenGraphText = (value: string, maxLength: number): string => {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxLength) {
    return collapsed;
  }
  const sliced = collapsed.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace >= 12 ? sliced.slice(0, lastSpace) : sliced).trimEnd();
};

/**
 * Appends `$og_title` and `$og_description`. The `$` stays literal because
 * Branch matches those key names before percent-decoding.
 */
const withOpenGraph = (url: URL, openGraph?: SocialLinkOpenGraph): string => {
  if (openGraph) {
    const title = compactOpenGraphText(
      openGraph.title,
      MAX_OPEN_GRAPH_TITLE_LENGTH,
    );
    const description = compactOpenGraphText(
      openGraph.description,
      MAX_OPEN_GRAPH_DESCRIPTION_LENGTH,
    );
    if (title) {
      url.searchParams.set(OPEN_GRAPH_TITLE_PARAM, title);
    }
    if (description) {
      url.searchParams.set(OPEN_GRAPH_DESCRIPTION_PARAM, description);
    }
  }
  return url
    .toString()
    .replace(/%24og_title=/g, '$og_title=')
    .replace(/%24og_description=/g, '$og_description=');
};

/**
 * Universal link for a trader profile. The same URL opens Social V0 or V1
 * from `socialAiTSA1122AbtestSocialBundleV1`.
 */
export const buildSocialTraderDeeplink = (
  traderId: string,
  openGraph?: SocialLinkOpenGraph,
): string => {
  const url = new URL(
    `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.SOCIAL}/${SOCIAL_PROFILE_SUBPATH}`,
  );
  url.searchParams.set('traderId', traderId);
  return withOpenGraph(url, openGraph);
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
  openGraph?: SocialLinkOpenGraph,
): string => {
  const url = new URL(
    `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.SOCIAL}/${SOCIAL_PROFILE_POSITION_SUBPATH}`,
  );
  url.searchParams.set('positionId', positionId);
  url.searchParams.set('traderId', traderId);
  return withOpenGraph(url, openGraph);
};

/**
 * Share payload for a trader profile. iOS puts the URL in both `message`
 * and `url`; Android shares it as the message text.
 */
export const buildSocialTraderShareContent = (
  traderId: string,
  os: typeof Platform.OS = Platform.OS,
  openGraph?: SocialLinkOpenGraph,
): { message: string; url?: string } =>
  toShareContent(buildSocialTraderDeeplink(traderId, openGraph), os);

/**
 * Share payload for a trader position. Same iOS message/url split as a
 * profile, because both go through `Share.share`.
 */
export const buildSocialTraderPositionShareContent = (
  positionId: string,
  traderId: string,
  os: typeof Platform.OS = Platform.OS,
  openGraph?: SocialLinkOpenGraph,
): { message: string; url?: string } =>
  toShareContent(
    buildSocialTraderPositionDeeplink(positionId, traderId, openGraph),
    os,
  );

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
 * Opens the native share sheet with the trader profile deeplink.
 */
export const shareSocialProfile = (
  traderId: string,
  onShared?: () => void,
  openGraph?: SocialLinkOpenGraph,
): void => {
  openShareSheet(
    buildSocialTraderShareContent(traderId, Platform.OS, openGraph),
    onShared,
  );
};

/**
 * Opens the native share sheet with the trader position deeplink.
 */
export const shareSocialTraderPosition = (
  positionId: string,
  traderId: string,
  onShared?: () => void,
  openGraph?: SocialLinkOpenGraph,
): void => {
  openShareSheet(
    buildSocialTraderPositionShareContent(
      positionId,
      traderId,
      Platform.OS,
      openGraph,
    ),
    onShared,
  );
};
