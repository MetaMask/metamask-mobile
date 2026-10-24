import { ACTIONS } from '../../../../constants/deeplinks';

export const SOCIAL_TRADER_SUBPATH = 'trader';
export const SOCIAL_TRADER_POSITION_SUBPATH = 'trader/position';

export type SocialDeeplinkTarget = 'home' | 'trader' | 'position';

/**
 * Classifies a Social universal-link path.
 *
 * Accepts the full pathname (`/social/trader`) or the remainder after the
 * `social` action (`/trader`, `/trader/position?positionId=`, `?tab=trending`).
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

  if (normalized === SOCIAL_TRADER_POSITION_SUBPATH) {
    return 'position';
  }
  if (normalized === SOCIAL_TRADER_SUBPATH) {
    return 'trader';
  }
  return 'home';
};
