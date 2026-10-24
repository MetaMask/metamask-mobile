import {
  detectPostLanguage,
  normalizeLocale,
  postNeedsTranslation,
} from './postLanguage';

describe('normalizeLocale', () => {
  it('returns the primary language subtag', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('ES_es')).toBe('es');
  });

  it('returns en when the locale is empty', () => {
    expect(normalizeLocale('')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
  });
});

describe('detectPostLanguage', () => {
  it('returns ja when the caption contains kana', () => {
    expect(detectPostLanguage('このトレードはまだ織り込まれていない。')).toBe(
      'ja',
    );
  });

  it('returns es when the caption uses Spanish words', () => {
    expect(
      detectPostLanguage('El mercado todavía no descuenta esta tesis.'),
    ).toBe('es');
  });

  it('returns en for a multi-word English caption', () => {
    expect(detectPostLanguage('Leverage is a lifestyle.')).toBe('en');
  });

  it('returns null for a caption that is too short to classify', () => {
    expect(detectPostLanguage('gm')).toBeNull();
  });
});

describe('postNeedsTranslation', () => {
  it('returns true when the caption language differs from the locale', () => {
    expect(
      postNeedsTranslation(
        'El mercado todavía no descuenta esta tesis.',
        'en-US',
      ),
    ).toBe(true);
  });

  it('returns false when the caption language matches the locale', () => {
    expect(postNeedsTranslation('Leverage is a lifestyle.', 'en')).toBe(false);
  });

  it('returns false when the caption language is unknown', () => {
    expect(postNeedsTranslation('gm', 'ja')).toBe(false);
  });
});
