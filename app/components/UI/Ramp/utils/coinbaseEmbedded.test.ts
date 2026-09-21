import type { Quote } from '@metamask/ramps-controller';

import {
  COINBASE_CHECKOUT_ORIGINS,
  COINBASE_EVENT_PREFIX,
  COINBASE_LIMIT_ERROR_CODES,
  getQuoteBuyWidgetFallback,
  isCoinbaseCheckoutUrl,
  isCoinbaseProviderId,
  parseCoinbaseCheckoutEvent,
} from './coinbaseEmbedded';

const makeQuote = (buyWidget?: Record<string, unknown>): Quote =>
  ({
    quote: buyWidget ? { buyWidget } : {},
  }) as unknown as Quote;

describe('getQuoteBuyWidgetFallback', () => {
  it('returns the fallback when present with a url', () => {
    const fallback = {
      url: 'https://pay.coinbase.com/buy',
      browser: 'IN_APP_OS_BROWSER',
    };
    const quote = makeQuote({ url: 'https://example.com', fallback });

    expect(getQuoteBuyWidgetFallback(quote)).toEqual(fallback);
  });

  it('returns undefined when buyWidget has no fallback', () => {
    const quote = makeQuote({ url: 'https://example.com' });

    expect(getQuoteBuyWidgetFallback(quote)).toBeUndefined();
  });

  it('returns undefined when buyWidget is absent', () => {
    const quote = makeQuote();

    expect(getQuoteBuyWidgetFallback(quote)).toBeUndefined();
  });

  it('returns undefined when fallback.url is empty', () => {
    const quote = makeQuote({
      url: 'https://example.com',
      fallback: { url: '', browser: 'IN_APP_OS_BROWSER' },
    });

    expect(getQuoteBuyWidgetFallback(quote)).toBeUndefined();
  });
});

describe('COINBASE_LIMIT_ERROR_CODES', () => {
  it('contains the three known limit error codes', () => {
    expect(
      COINBASE_LIMIT_ERROR_CODES.has('ERROR_CODE_GUEST_TRANSACTION_LIMIT'),
    ).toBe(true);
    expect(
      COINBASE_LIMIT_ERROR_CODES.has('ERROR_CODE_GUEST_TRANSACTION_COUNT'),
    ).toBe(true);
    expect(
      COINBASE_LIMIT_ERROR_CODES.has('ERROR_CODE_LIMITS_UPGRADE_BLOCKED'),
    ).toBe(true);
  });

  it('does not contain an unrelated code', () => {
    expect(COINBASE_LIMIT_ERROR_CODES.has('SOME_OTHER_ERROR')).toBe(false);
  });
});

describe('parseCoinbaseCheckoutEvent', () => {
  it('parses an event with data', () => {
    const data = JSON.stringify({
      eventName: `${COINBASE_EVENT_PREFIX}session_error`,
      data: {
        errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
        errorMessage: 'Guest limit reached',
      },
    });

    expect(parseCoinbaseCheckoutEvent(data)).toEqual({
      eventName: 'session_error',
      errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
      errorMessage: 'Guest limit reached',
    });
  });

  it('parses an event without data', () => {
    const data = JSON.stringify({
      eventName: `${COINBASE_EVENT_PREFIX}load_success`,
    });

    expect(parseCoinbaseCheckoutEvent(data)).toEqual({
      eventName: 'load_success',
      errorCode: undefined,
      errorMessage: undefined,
    });
  });

  it('returns undefined for a non-string body', () => {
    expect(
      parseCoinbaseCheckoutEvent({ eventName: 'onramp_api.load_success' }),
    ).toBeUndefined();
    expect(parseCoinbaseCheckoutEvent(undefined)).toBeUndefined();
    expect(parseCoinbaseCheckoutEvent(null)).toBeUndefined();
  });

  it('returns undefined for a non-JSON string', () => {
    expect(parseCoinbaseCheckoutEvent('not json')).toBeUndefined();
  });

  it('returns undefined for an event without the Coinbase prefix', () => {
    const data = JSON.stringify({ type: 'IFRAME_DETECTED' });

    expect(parseCoinbaseCheckoutEvent(data)).toBeUndefined();
  });

  it('returns undefined when eventName does not start with the prefix', () => {
    const data = JSON.stringify({ eventName: 'load_success' });

    expect(parseCoinbaseCheckoutEvent(data)).toBeUndefined();
  });

  it('ignores non-string errorCode and errorMessage', () => {
    const data = JSON.stringify({
      eventName: `${COINBASE_EVENT_PREFIX}commit_error`,
      data: { errorCode: 42, errorMessage: null },
    });

    expect(parseCoinbaseCheckoutEvent(data)).toEqual({
      eventName: 'commit_error',
      errorCode: undefined,
      errorMessage: undefined,
    });
  });
});

describe('isCoinbaseCheckoutUrl', () => {
  it('returns true for a URL on the trusted Coinbase checkout origin', () => {
    expect(
      isCoinbaseCheckoutUrl(
        'https://pay.coinbase.com/v3/api-onramp/embedded-order?sessionToken=abc',
      ),
    ).toBe(true);
  });

  it('returns true for the bare trusted origin', () => {
    expect(isCoinbaseCheckoutUrl('https://pay.coinbase.com')).toBe(true);
  });

  it('returns false for a different origin', () => {
    expect(isCoinbaseCheckoutUrl('https://evil.example.com')).toBe(false);
  });

  it('returns false for a look-alike host', () => {
    expect(
      isCoinbaseCheckoutUrl('https://pay.coinbase.com.evil.example.com'),
    ).toBe(false);
  });

  it('returns false for a non-HTTPS scheme on the trusted host', () => {
    expect(isCoinbaseCheckoutUrl('http://pay.coinbase.com')).toBe(false);
  });

  it('returns false for an unparseable URL', () => {
    expect(isCoinbaseCheckoutUrl('not a url')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCoinbaseCheckoutUrl(undefined)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isCoinbaseCheckoutUrl('')).toBe(false);
  });

  it('COINBASE_CHECKOUT_ORIGINS contains only the trusted origin', () => {
    expect(COINBASE_CHECKOUT_ORIGINS).toEqual(['https://pay.coinbase.com']);
  });
});

describe('isCoinbaseProviderId', () => {
  it.each([
    'coinbase',
    'coinbase-m',
    '/providers/coinbase',
    '/providers/coinbase-m',
  ])('returns true for %s', (providerId) => {
    expect(isCoinbaseProviderId(providerId)).toBe(true);
  });

  it.each(['transak', '/providers/transak', 'notcoinbase', 'coinbasex', ''])(
    'returns false for %s',
    (providerId) => {
      expect(isCoinbaseProviderId(providerId)).toBe(false);
    },
  );

  it('returns false for undefined', () => {
    expect(isCoinbaseProviderId(undefined)).toBe(false);
  });
});
