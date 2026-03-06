import { getFaviconUrl } from './marketInsightsFormatting';

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
