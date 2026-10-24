import { translatePost } from './stubPostTranslation';

describe('translatePost', () => {
  it('returns the prepared English phrase for a known Spanish caption', () => {
    const result = translatePost(
      'El mercado todavía no descuenta esta tesis.',
      'en-US',
    );

    expect(result).toEqual({
      text: 'The market still has not priced in this thesis.',
      matchedPhrase: true,
    });
  });

  it('returns the prepared Spanish phrase for a known English caption', () => {
    const result = translatePost('Leverage is a lifestyle.', 'es');

    expect(result.matchedPhrase).toBe(true);
    expect(result.text).toBe('El apalancamiento es un estilo de vida.');
  });

  it('tags an unknown caption with the target language', () => {
    const result = translatePost('A caption the stub has never seen.', 'fr');

    expect(result).toEqual({
      text: '[fr] A caption the stub has never seen.',
      matchedPhrase: false,
    });
  });
});
