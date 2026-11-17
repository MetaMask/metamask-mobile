import {
  COINBASE_CHECKOUT_ORIGINS,
  COINBASE_EVENT_PREFIX,
  COINBASE_EXPIRED_SESSION_TOKEN,
  COINBASE_LIMIT_ERROR_CODES,
  coinbaseCheckoutPageEventAdapter,
  isCoinbaseCheckoutUrl,
  isCoinbaseProviderId,
  parseCoinbaseCheckoutEvent,
  toCheckoutPageEvent,
} from './coinbaseEmbedded';

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

describe('toCheckoutPageEvent', () => {
  it.each([
    ['load_success', 'loaded'],
    ['apple_pay_button_pressed', 'payment_started'],
    ['google_pay_button_pressed', 'payment_started'],
    ['pending_payment_auth', 'payment_started'],
    ['payment_authorized', 'payment_started'],
    ['commit_success', 'committed'],
    ['polling_success', 'completed'],
    ['commit_error', 'payment_failed'],
    ['polling_error', 'payment_failed'],
    ['cancel', 'cancelled'],
    ['polling_start', 'tracked_only'],
    ['verification_success', 'tracked_only'],
  ] as const)('maps %s to %s and keeps the raw name', (eventName, kind) => {
    expect(toCheckoutPageEvent({ eventName })).toEqual({
      kind,
      name: eventName,
      errorCode: undefined,
    });
  });

  it('maps load_error with an expired session token to a link_expired load failure', () => {
    expect(
      toCheckoutPageEvent({
        eventName: 'load_error',
        errorCode: COINBASE_EXPIRED_SESSION_TOKEN,
      }),
    ).toEqual({
      kind: 'load_failed',
      name: 'load_error',
      errorCode: COINBASE_EXPIRED_SESSION_TOKEN,
      reason: 'link_expired',
    });
  });

  it('maps any other load_error to a load failure without a reason', () => {
    expect(
      toCheckoutPageEvent({ eventName: 'load_error', errorCode: 'other' }),
    ).toEqual({ kind: 'load_failed', name: 'load_error', errorCode: 'other' });
  });

  it.each([...COINBASE_LIMIT_ERROR_CODES])(
    'maps session_error %s to limit_reached',
    (errorCode) => {
      expect(
        toCheckoutPageEvent({ eventName: 'session_error', errorCode }),
      ).toEqual({ kind: 'limit_reached', name: 'session_error', errorCode });
    },
  );

  it('maps a non-limit session_error to failed', () => {
    expect(
      toCheckoutPageEvent({
        eventName: 'session_error',
        errorCode: 'ERROR_CODE_OTHER',
      }),
    ).toEqual({
      kind: 'failed',
      name: 'session_error',
      errorCode: 'ERROR_CODE_OTHER',
    });
  });

  it('maps a session_error without a code to failed', () => {
    expect(toCheckoutPageEvent({ eventName: 'session_error' })).toEqual({
      kind: 'failed',
      name: 'session_error',
      errorCode: undefined,
    });
  });
});

describe('coinbaseCheckoutPageEventAdapter', () => {
  it('matches Coinbase provider ids only', () => {
    expect(coinbaseCheckoutPageEventAdapter.matches('coinbase-m')).toBe(true);
    expect(
      coinbaseCheckoutPageEventAdapter.matches('/providers/coinbase'),
    ).toBe(true);
    expect(coinbaseCheckoutPageEventAdapter.matches('moonpay')).toBe(false);
  });

  it('trusts the Coinbase checkout origin only', () => {
    expect(
      coinbaseCheckoutPageEventAdapter.isTrustedUrl(
        'https://pay.coinbase.com/buy',
      ),
    ).toBe(true);
    expect(
      coinbaseCheckoutPageEventAdapter.isTrustedUrl('https://evil.example.com'),
    ).toBe(false);
  });

  it('parses a Coinbase message body into a neutral event', () => {
    const data = JSON.stringify({
      eventName: `${COINBASE_EVENT_PREFIX}session_error`,
      data: { errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT' },
    });

    expect(coinbaseCheckoutPageEventAdapter.parse(data)).toEqual({
      kind: 'limit_reached',
      name: 'session_error',
      errorCode: 'ERROR_CODE_GUEST_TRANSACTION_LIMIT',
    });
  });

  it('returns undefined for a body that is not a Coinbase event', () => {
    expect(
      coinbaseCheckoutPageEventAdapter.parse('{"type":"IFRAME_DETECTED"}'),
    ).toBeUndefined();
  });
});
