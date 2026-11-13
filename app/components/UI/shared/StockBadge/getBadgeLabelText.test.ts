import { getBadgeLabelText } from './getBadgeLabelText';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'token.stock': 'Localized Stock',
    };
    return translations[key] || key;
  }),
}));

describe('getBadgeLabelText', () => {
  it.each(['Stock', 'stock', ' STOCK '])(
    'localizes the known label %p',
    (badgeLabel) => {
      expect(getBadgeLabelText(badgeLabel)).toBe('Localized Stock');
    },
  );

  it('returns unknown labels as provided', () => {
    expect(getBadgeLabelText('ETF')).toBe('ETF');
  });

  it('does not resolve inherited object keys as known labels', () => {
    expect(getBadgeLabelText('constructor')).toBe('constructor');
  });
});
