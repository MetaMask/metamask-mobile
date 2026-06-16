import { redactUrlForAnalytics } from './redactUrlForAnalytics';

describe('redactUrlForAnalytics', () => {
  it('returns origin + pathname for a standard URL', () => {
    expect(redactUrlForAnalytics('https://provider.example.com/checkout')).toBe(
      'https://provider.example.com/checkout',
    );
  });

  it('strips query string containing potential PII', () => {
    expect(
      redactUrlForAnalytics(
        'https://provider.example.com/checkout?email=user@example.com&walletAddress=0xabc123&amount=100',
      ),
    ).toBe('https://provider.example.com/checkout');
  });

  it('strips URL fragment', () => {
    expect(
      redactUrlForAnalytics(
        'https://provider.example.com/checkout#section-payment',
      ),
    ).toBe('https://provider.example.com/checkout');
  });

  it('strips both query and fragment together', () => {
    expect(
      redactUrlForAnalytics(
        'https://provider.example.com/flow?token=secret#step-3',
      ),
    ).toBe('https://provider.example.com/flow');
  });

  it('preserves path-only URLs without trailing slash changes', () => {
    expect(redactUrlForAnalytics('https://example.com')).toBe(
      'https://example.com/',
    );
  });

  it('falls back to raw input when URL is unparseable', () => {
    expect(redactUrlForAnalytics('not a url at all')).toBe('not a url at all');
  });

  it('returns empty string unchanged', () => {
    expect(redactUrlForAnalytics('')).toBe('');
  });
});
