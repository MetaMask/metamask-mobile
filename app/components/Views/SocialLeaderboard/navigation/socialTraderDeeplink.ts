import { Platform } from 'react-native';
import Share from 'react-native-share';
import { ACTIONS, PROTOCOLS } from '../../../../constants/deeplinks';
import AppConstants from '../../../../core/AppConstants';
import {
  SOCIAL_PROFILE_POSITION_SUBPATH,
  SOCIAL_PROFILE_SUBPATH,
} from '../../../../core/DeeplinkManager/util/deeplinks/socialDeeplinkPath';

/**
 * Universal link for a trader profile. The same URL opens Social V0 or V1
 * from `socialAiTSA1122AbtestSocialBundleV1`.
 */
export const buildSocialTraderDeeplink = (traderId: string): string => {
  const url = new URL(
    `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.SOCIAL}/${SOCIAL_PROFILE_SUBPATH}`,
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
    `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.SOCIAL}/${SOCIAL_PROFILE_POSITION_SUBPATH}`,
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
): void => {
  openShareSheet(buildSocialTraderShareContent(traderId), onShared);
};

/**
 * Opens the native share sheet with the trader position deeplink.
 */
export const shareSocialTraderPosition = (
  positionId: string,
  traderId: string,
  onShared?: () => void,
): void => {
  openShareSheet(
    buildSocialTraderPositionShareContent(positionId, traderId),
    onShared,
  );
};
