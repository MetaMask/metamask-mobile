import { resolveTrackingLabel } from './moneyTrackingLabel';

const mockStrings = jest.fn();

jest.mock('../../../../../locales/i18n', () => ({
  strings: (...args: unknown[]) => mockStrings(...args),
}));

describe('resolveTrackingLabel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns label_localized from strings(key) with no locale option', () => {
    mockStrings.mockImplementation((key: string) => `localized:${key}`);

    const result = resolveTrackingLabel('money.some.key');

    expect(result.label_localized).toBe('localized:money.some.key');
  });

  it('returns label_en from strings(key, { locale: "en" })', () => {
    mockStrings.mockImplementation((key: string, opts?: { locale?: string }) =>
      opts?.locale === 'en' ? `en:${key}` : `localized:${key}`,
    );

    const result = resolveTrackingLabel('money.some.key');

    expect(result.label_en).toBe('en:money.some.key');
  });

  it('returns distinct label_en and label_localized when locale differs', () => {
    mockStrings.mockImplementation((key: string, opts?: { locale?: string }) =>
      opts?.locale === 'en' ? `english:${key}` : `french:${key}`,
    );

    const result = resolveTrackingLabel('money.add_money');

    expect(result.label_en).toBe('english:money.add_money');
    expect(result.label_localized).toBe('french:money.add_money');
    expect(result.label_en).not.toBe(result.label_localized);
  });
});
