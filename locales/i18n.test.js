import {
  supportedTranslations,
  getLanguages,
  normalizeLegacyPercentInterpolation,
} from './i18n';

describe('getLanguage', () => {
  it('should have the same keys() as supportedTranslations', () => {
    const supportedTranslationsKeys = Object.keys(supportedTranslations);
    const getLanguagesKeys = Object.keys(getLanguages());
    expect(supportedTranslationsKeys.sort()).toEqual(getLanguagesKeys.sort());
  });
});

describe('normalizeLegacyPercentInterpolation', () => {
  it('normalizes percent-prefixed placeholders', () => {
    const result = normalizeLegacyPercentInterpolation('%{{percentage}} bonus');
    expect(result).toBe('%%{percentage} bonus');
  });

  it('normalizes nested translation objects', () => {
    const input = {
      title: '%{{distance}} away',
      nested: {
        description: 'Save %{{percentage}} now',
      },
      array: ['%{{fee}} fee', 'other'],
    };

    const result = normalizeLegacyPercentInterpolation(input);

    expect(result).toEqual({
      title: '%%{distance} away',
      nested: {
        description: 'Save %%{percentage} now',
      },
      array: ['%%{fee} fee', 'other'],
    });
  });

  it('keeps non-matching values unchanged', () => {
    expect(normalizeLegacyPercentInterpolation('{{percentage}}% bonus')).toBe(
      '{{percentage}}% bonus',
    );
    expect(normalizeLegacyPercentInterpolation(123)).toBe(123);
  });
});
