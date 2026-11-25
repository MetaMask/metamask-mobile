import { toSumSubLocale } from './toSumSubLocale';

describe('toSumSubLocale', () => {
  it('maps the settings Portuguese code to Brazilian Portuguese', () => {
    const locale = 'pt';

    const result = toSumSubLocale(locale);

    expect(result).toBe('pt-BR');
  });

  it('maps a Portuguese device tag to Brazilian Portuguese', () => {
    const locale = 'pt-BR';

    const result = toSumSubLocale(locale);

    expect(result).toBe('pt-BR');
  });

  it('maps an underscored Portuguese device tag to Brazilian Portuguese', () => {
    const locale = 'pt_BR';

    const result = toSumSubLocale(locale);

    expect(result).toBe('pt-BR');
  });

  it('reduces a regional device tag to its language subtag', () => {
    const locale = 'es-MX';

    const result = toSumSubLocale(locale);

    expect(result).toBe('es');
  });

  it('reduces a script device tag to its language subtag', () => {
    const locale = 'zh-Hans';

    const result = toSumSubLocale(locale);

    expect(result).toBe('zh');
  });

  it('keeps a settings language code SumSub already accepts', () => {
    const locale = 'en';

    const result = toSumSubLocale(locale);

    expect(result).toBe('en');
  });

  it('maps the settings Filipino code to the SumSub code', () => {
    const locale = 'tl';

    const result = toSumSubLocale(locale);

    expect(result).toBe('fl');
  });

  it('maps the Filipino device tag to the SumSub code', () => {
    const locale = 'fil';

    const result = toSumSubLocale(locale);

    expect(result).toBe('fl');
  });

  it('returns a locale with no language subtag unchanged', () => {
    const locale = '123';

    const result = toSumSubLocale(locale);

    expect(result).toBe('123');
  });
});
