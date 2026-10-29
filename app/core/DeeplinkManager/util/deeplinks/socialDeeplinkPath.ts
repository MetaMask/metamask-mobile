import { ACTIONS } from '../../../../constants/deeplinks';

export const SOCIAL_PROFILE_SUBPATH = 'profile';
export const SOCIAL_PROFILE_POSITION_SUBPATH = 'profile/position';

export type SocialDeeplinkTarget = 'home' | 'trader' | 'position';

/**
 * Classifies a Social universal-link path.
 *
 * Accepts the full pathname (`/social/profile`) or the remainder after the
 * `social` action (`/profile`, `/profile/position?positionId=`, `?tab=trending`).
 * An empty or unrecognized subpath is Social home.
 */
export const resolveSocialDeeplinkTarget = (
  path: string,
): SocialDeeplinkTarget => {
  const withoutQuery = path.split('?')[0] ?? '';
  let normalized = withoutQuery.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (normalized === ACTIONS.SOCIAL) {
    normalized = '';
  } else if (normalized.startsWith(`${ACTIONS.SOCIAL}/`)) {
    normalized = normalized.slice(ACTIONS.SOCIAL.length + 1);
  }

  if (normalized === SOCIAL_PROFILE_POSITION_SUBPATH) {
    return 'position';
  }
  if (normalized === SOCIAL_PROFILE_SUBPATH) {
    return 'trader';
  }
  return 'home';
};
