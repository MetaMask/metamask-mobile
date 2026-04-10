import { redactUrlForAnalytics } from './redactUrlForAnalytics';

describe('redactUrlForAnalytics', () => {
  it('strips query params from a URL', () => {
    const result = redactUrlForAnalytics(
      'https://buy.moonpay.com/checkout?email=user@test.com&walletAddress=0xabc',
    );

    expect(result).toBe('https://buy.moonpay.com/checkout');
  });

  it('strips fragment from a URL', () => {
    const result = redactUrlForAnalytics(
      'https://global.transak.com/widget#token=secret',
    );

    expect(result).toBe('https://global.transak.com/widget');
  });

  it('strips both query params and fragment', () => {
    const result = redactUrlForAnalytics(
      'https://provider.example.com/pay?orderId=123#step=2',
    );

    expect(result).toBe('https://provider.example.com/pay');
  });

  it('preserves the full path when no query or fragment exists', () => {
    const result = redactUrlForAnalytics(
      'https://provider.example.com/checkout/step/confirm',
    );

    expect(result).toBe('https://provider.example.com/checkout/step/confirm');
  });

  it('returns the raw string when the URL is unparseable', () => {
    const result = redactUrlForAnalytics('not-a-url');

    expect(result).toBe('not-a-url');
  });

  it('handles empty string', () => {
    const result = redactUrlForAnalytics('');

    expect(result).toBe('');
  });
});
