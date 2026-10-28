import { strings } from '../../../../../../locales/i18n';
import { formatJoinedLabel } from './formatJoinedLabel';

describe('formatJoinedLabel', () => {
  const now = new Date('2026-04-01T00:00:00Z');

  it('returns a Joined relative label for a valid timestamp', () => {
    const result = formatJoinedLabel('2026-01-01T00:00:00Z', now);

    expect(result).toBe(
      strings('social_leaderboard.my_profile.joined', {
        time: '3mo ago',
      }),
    );
  });

  it('returns null when the timestamp is missing', () => {
    expect(formatJoinedLabel(null, now)).toBeNull();
    expect(formatJoinedLabel('', now)).toBeNull();
  });

  it('returns null when the timestamp is not a date', () => {
    expect(formatJoinedLabel('not-a-date', now)).toBeNull();
  });
});
