import I18n from '../../../../../../locales/i18n';
import { formatJoinedLabel } from './formatJoinedLabel';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Some locales insert a no-break space between the count and the unit. */
const readable = (value: string | null): string | null =>
  value?.replace(/[\u00a0\u202f]/g, ' ') ?? null;

describe('formatJoinedLabel', () => {
  const now = new Date('2026-04-01T00:00:00Z');
  const originalLocale = I18n.locale;

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it('returns an English joined sentence for a three-month-old profile', () => {
    I18n.locale = 'en';

    const result = formatJoinedLabel('2026-01-01T00:00:00Z', now);

    expect(readable(result)).toBe('Joined 3 months ago');
  });

  it('returns an English joined sentence for a three-day-old profile', () => {
    I18n.locale = 'en';
    const joinedAt = new Date(now.getTime() - 3 * DAY_MS).toISOString();

    const result = formatJoinedLabel(joinedAt, now);

    expect(readable(result)).toBe('Joined 3 days ago');
  });

  it('uses the singular day in English', () => {
    I18n.locale = 'en';
    const joinedAt = new Date(
      now.getTime() - 26 * 60 * 60 * 1000,
    ).toISOString();

    const result = formatJoinedLabel(joinedAt, now);

    expect(readable(result)).toBe('Joined a day ago');
  });

  it('formats a six-hour-old profile in hours', () => {
    I18n.locale = 'en';
    const joinedAt = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

    const result = formatJoinedLabel(joinedAt, now);

    expect(readable(result)).toBe('Joined 6 hours ago');
  });

  it('formats a seven-day-old profile with a plural day', () => {
    I18n.locale = 'en';
    const joinedAt = new Date(now.getTime() - 7 * DAY_MS).toISOString();

    const result = formatJoinedLabel(joinedAt, now);

    expect(readable(result)).toBe('Joined 7 days ago');
  });

  it('returns a grammatical French sentence for a three-day-old profile', () => {
    I18n.locale = 'fr';
    const joinedAt = new Date(now.getTime() - 3 * DAY_MS).toISOString();

    const result = formatJoinedLabel(joinedAt, now);

    expect(readable(result)).toBe('Inscrit depuis 3 jours');
    expect(result).not.toMatch(/days|ago|il y a/i);
  });

  it('returns a grammatical French sentence for a three-month-old profile', () => {
    I18n.locale = 'fr';

    const result = formatJoinedLabel('2026-01-01T00:00:00Z', now);

    expect(readable(result)).toBe('Inscrit depuis 3 mois');
    expect(result).not.toMatch(/months|ago|il y a/i);
  });

  it('uses the singular day in French', () => {
    I18n.locale = 'fr';
    const joinedAt = new Date(
      now.getTime() - 26 * 60 * 60 * 1000,
    ).toISOString();

    const result = formatJoinedLabel(joinedAt, now);

    expect(readable(result)).toBe('Inscrit depuis un jour');
  });

  it('formats a six-hour-old profile in French hours', () => {
    I18n.locale = 'fr';
    const joinedAt = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

    const result = formatJoinedLabel(joinedAt, now);

    expect(readable(result)).toBe('Inscrit depuis 6 heures');
    expect(result).not.toMatch(/seconds|secondes|ago/i);
  });

  it('returns null when the timestamp is missing', () => {
    expect(formatJoinedLabel(null, now)).toBeNull();
    expect(formatJoinedLabel('', now)).toBeNull();
    expect(formatJoinedLabel('   ', now)).toBeNull();
  });

  it('returns null when the timestamp is not a date', () => {
    expect(formatJoinedLabel('not-a-date', now)).toBeNull();
  });
});
