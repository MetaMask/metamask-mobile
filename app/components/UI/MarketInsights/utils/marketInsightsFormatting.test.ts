import {
  buildHighlightedSegments,
  getFaviconUrl,
} from './marketInsightsFormatting';

describe('buildHighlightedSegments', () => {
  it('ignores empty highlight terms', () => {
    const result = buildHighlightedSegments('ETF optimism drives momentum', [
      'ETF optimism',
      '',
    ]);

    expect(result).toStrictEqual([
      { text: 'ETF optimism', highlighted: true },
      { text: ' drives momentum', highlighted: false },
    ]);
  });

  it('returns unhighlighted text when all terms are empty or whitespace', () => {
    const result = buildHighlightedSegments('ETF optimism drives momentum', [
      '',
      '   ',
    ]);

    expect(result).toStrictEqual([
      { text: 'ETF optimism drives momentum', highlighted: false },
    ]);
  });
});

describe('getFaviconUrl', () => {
  it('uses hostname when source is a full URL', () => {
    expect(getFaviconUrl('https://www.coindesk.com/markets/')).toBe(
      'https://www.google.com/s2/favicons?domain=www.coindesk.com&sz=32',
    );
  });

  it('handles bare domains consistently', () => {
    expect(getFaviconUrl('coindesk.com')).toBe(
      'https://www.google.com/s2/favicons?domain=coindesk.com&sz=32',
    );
  });
});
