import { Platform, Share } from 'react-native';
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

const toShareContent = (
  sharedUrl: string,
  os: typeof Platform.OS,
): { url: string } | { message: string } =>
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
    `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.SOCIAL}/${SOCIAL_PROFILE_POSITION_SUBPATH}`,
  );
  url.searchParams.set('positionId', positionId);
  url.searchParams.set('traderId', traderId);
  return url.toString();
};

/**
 * Share payload for a trader profile. iOS shares the URL; Android shares it
 * as the message text.
 */
export const buildSocialTraderShareContent = (
  traderId: string,
  os: typeof Platform.OS = Platform.OS,
): { url: string } | { message: string } =>
  toShareContent(buildSocialTraderDeeplink(traderId), os);

/**
 * Share payload for a trader position. iOS shares the URL; Android shares it
 * as the message text.
 */
export const buildSocialTraderPositionShareContent = (
  positionId: string,
  traderId: string,
  os: typeof Platform.OS = Platform.OS,
): { url: string } | { message: string } =>
  toShareContent(buildSocialTraderPositionDeeplink(positionId, traderId), os);

/**
 * Opens the native share sheet with the trader profile deeplink.
 */
export const shareSocialProfile = (traderId: string): void => {
  Share.share(buildSocialTraderShareContent(traderId)).catch(() => undefined);
};

/**
 * Opens the native share sheet with the trader position deeplink.
 */
export const shareSocialTraderPosition = (
  positionId: string,
  traderId: string,
): void => {
  Share.share(
    buildSocialTraderPositionShareContent(positionId, traderId),
  ).catch(() => undefined);
};
