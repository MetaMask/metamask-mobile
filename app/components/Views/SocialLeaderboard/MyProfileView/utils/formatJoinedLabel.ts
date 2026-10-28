import { strings } from '../../../../../../locales/i18n';
import { formatSocialRelativeAge } from '../../../../UI/SocialFeed/utils/formatSocialTime';

/**
 * "Joined" line on a profile, using the shared compact age (`Joined 3mo ago`).
 *
 * @param joinedAt - Profile creation time as an ISO string.
 * @param now - Wall clock used for the age.
 * @returns Localized label, or null when the timestamp is missing or unparseable.
 */
export const formatJoinedLabel = (
  joinedAt: string | null | undefined,
  now: Date = new Date(),
): string | null => {
  if (!joinedAt?.trim()) {
    return null;
  }

  const joinedMs = Date.parse(joinedAt);
  if (Number.isNaN(joinedMs)) {
    return null;
  }

  return strings('social_leaderboard.my_profile.joined', {
    time: formatSocialRelativeAge(joinedMs, now.getTime()),
  });
};
