/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import { hasRealAvatar } from '../../../Homepage/Sections/TopTraders/utils/avatarFallback';
/* eslint-enable import-x/no-restricted-paths */

/**
 * Prefer a real remote profile photo, then a list/nav snapshot URL.
 * Placeholder and missing URLs stay undefined so `TraderAvatar` can Maskicon.
 */
export const preferTraderAvatarUrl = (
  liveImageUrl: string | null | undefined,
  fallbackImageUrl?: string | null,
): string | undefined => {
  if (hasRealAvatar(liveImageUrl)) {
    return liveImageUrl;
  }
  if (hasRealAvatar(fallbackImageUrl)) {
    return fallbackImageUrl;
  }
  return undefined;
};
