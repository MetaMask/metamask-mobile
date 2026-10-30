import { MINUTE } from '../../../../../constants/time';
import { EM_DASH } from '../../../../UI/SocialFeed/utils/formatters';
import { formatSocialElapsed } from '../../../../UI/SocialFeed/utils/formatSocialTime';

/**
 * Average hold on a trader profile, in the shared compact units (`45m`, `1h`,
 * `2d`).
 *
 * @param minutes - Median hold reported by the profile, in minutes.
 * @returns Compact hold label, or an em dash when the span is not positive.
 */
export function formatHoldTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return EM_DASH;
  }
  return formatSocialElapsed(minutes * MINUTE);
}
