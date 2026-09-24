import I18n from '../../../../../locales/i18n';
import { formatUkMigrationDeadline } from './formatUkMigrationDeadline';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
}));

describe('formatUkMigrationDeadline', () => {
  const originalLocale = I18n.locale;

  afterEach(() => {
    (I18n as { locale: string }).locale = originalLocale;
  });

  it('formats a late-UTC endDate as that UTC calendar day, not the next local day', () => {
    (I18n as { locale: string }).locale = 'en-US';
    const deadline = new Date('2026-09-30T23:59:59.999Z');

    expect(formatUkMigrationDeadline(deadline)).toBe('Sep 30');
    expect(formatUkMigrationDeadline(deadline, { includeYear: true })).toBe(
      'Sep 30, 2026',
    );
  });

  it('uses the active locale', () => {
    (I18n as { locale: string }).locale = 'en-GB';

    expect(
      formatUkMigrationDeadline(new Date('2026-09-30T23:59:59.999Z'), {
        includeYear: true,
      }),
    ).toBe('30 Sept 2026');
  });
});
