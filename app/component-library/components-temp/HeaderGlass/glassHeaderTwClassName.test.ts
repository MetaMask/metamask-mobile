import { glassHeaderTwClassName } from './glassHeaderTwClassName';

describe('glassHeaderTwClassName', () => {
  it('uses px-4 when the caller passes no classes', () => {
    expect(glassHeaderTwClassName()).toBe('px-4');
    expect(glassHeaderTwClassName('')).toBe('px-4');
  });

  it('keeps caller classes and lets px-4 win over horizontal padding', () => {
    expect(glassHeaderTwClassName('min-h-14 h-auto px-2 bg-default')).toBe(
      'min-h-14 h-auto px-2 bg-default px-4',
    );
  });
});
