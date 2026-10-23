import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { strings } from '../../../../../../locales/i18n';

dayjs.extend(relativeTime);

export const formatJoinedLabel = (
  joinedAt: string | null | undefined,
  now: Date = new Date(),
): string | null => {
  if (!joinedAt?.trim()) {
    return null;
  }

  const joined = dayjs(joinedAt);
  if (!joined.isValid()) {
    return null;
  }

  return strings('social_leaderboard.my_profile.joined', {
    time: joined.from(now),
  });
};
