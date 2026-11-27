import { getNativeTradeIcons } from './homeTabs.icons';

describe('getNativeTradeIcons', () => {
  it('returns the glyphs for a supported language', () => {
    const japanese = getNativeTradeIcons('ja');

    expect(japanese).not.toBe(getNativeTradeIcons('en'));
    expect(japanese).toHaveProperty('closed');
    expect(japanese).toHaveProperty('open');
  });

  it('ignores the region of the locale', () => {
    expect(getNativeTradeIcons('ja-JP')).toBe(getNativeTradeIcons('ja'));
    expect(getNativeTradeIcons('PT-br')).toBe(getNativeTradeIcons('pt'));
  });

  it('uses the English glyphs for German, which keeps the English word', () => {
    expect(getNativeTradeIcons('de')).toBe(getNativeTradeIcons('en'));
  });

  it('falls back to English for an unsupported language', () => {
    expect(getNativeTradeIcons('xx-YY')).toBe(getNativeTradeIcons('en'));
  });
});
