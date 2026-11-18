import {
  createPackPartnerError,
  isFetchNetworkError,
  isPackPartnerError,
  isPackPartnerErrorCode,
  toPackPartnerError,
  toErrorState,
} from './errors';

describe('createPackPartnerError', () => {
  it('builds an Error with only safe operation context', () => {
    const error = createPackPartnerError({
      code: 'SUBMIT_FAILED',
      status: 500,
      retryable: true,
      context: 'POST /submitTransaction',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'PackPartnerError',
      code: 'SUBMIT_FAILED',
      message: 'POST /submitTransaction: SUBMIT_FAILED (HTTP 500)',
      status: 500,
      retryable: true,
      context: 'POST /submitTransaction',
    });
    expect(error).not.toHaveProperty('cause');
  });

  it('discards an unrecognized context and invalid HTTP status', () => {
    const error = createPackPartnerError({
      code: 'INVALID_RESPONSE',
      context: 'private-transaction',
      status: NaN,
    });

    expect(error.message).toBe('INVALID_RESPONSE');
    expect(error).not.toHaveProperty('context');
    expect(error).not.toHaveProperty('status');
  });

  it.each([
    ['CONFIGURATION_ERROR', false],
    ['NETWORK_ERROR', true],
    ['RATE_LIMITED', true],
    ['OPEN_PENDING', true],
    ['SIGNING_REJECTED', false],
    ['UNKNOWN', false],
  ] as const)('defaults retryable for %s to %s', (code, retryable) => {
    const error = createPackPartnerError({ code });

    expect(error.retryable).toBe(retryable);
    expect(error.message).toBe(code);
  });

  it('omits status and cause when not provided', () => {
    const error = createPackPartnerError({ code: 'UNKNOWN' });

    expect('status' in error).toBe(false);
    expect('cause' in error).toBe(false);
  });
});

describe('isPackPartnerError', () => {
  it('recognizes created errors', () => {
    expect(
      isPackPartnerError(createPackPartnerError({ code: 'NOT_FOUND' })),
    ).toBe(true);
  });

  it.each([
    ['a plain Error', new Error('x')],
    [
      'a plain object',
      { name: 'PackPartnerError', code: 'UNKNOWN', retryable: false },
    ],
    [
      'an unknown code',
      Object.assign(new Error('x'), {
        name: 'PackPartnerError',
        code: 'NOPE',
        retryable: false,
      }),
    ],
    ['null', null],
  ])('rejects %s', (_, value) => {
    expect(isPackPartnerError(value)).toBe(false);
  });
});

describe('isPackPartnerErrorCode', () => {
  it('accepts known codes only', () => {
    expect(isPackPartnerErrorCode('PACK_EXPIRED')).toBe(true);
    expect(isPackPartnerErrorCode('toString')).toBe(false);
    expect(isPackPartnerErrorCode(1)).toBe(false);
  });
});

describe('toPackPartnerError', () => {
  it('passes PackPartner errors through', () => {
    const error = createPackPartnerError({ code: 'PACK_FAILED' });

    expect(toPackPartnerError(error, 'UNKNOWN')).toBe(error);
  });

  it('maps fetch failures to a retryable NETWORK_ERROR', () => {
    const cause = new TypeError('Network request failed');

    const error = toPackPartnerError(cause, 'SUBMIT_FAILED');

    expect(error).toMatchObject({
      code: 'NETWORK_ERROR',
      retryable: true,
      message: 'NETWORK_ERROR',
    });
  });

  it('uses the fallback code for other errors', () => {
    const error = toPackPartnerError(new Error('odd'), 'SIGNING_REJECTED');

    expect(error).toMatchObject({
      code: 'SIGNING_REJECTED',
      retryable: false,
      message: 'SIGNING_REJECTED',
    });
  });

  it('discards arbitrary string and object messages', () => {
    expect(toPackPartnerError('bad')).toMatchObject({
      code: 'UNKNOWN',
      message: 'UNKNOWN',
    });
    expect(toPackPartnerError({ message: 'rpc' })).toMatchObject({
      message: 'UNKNOWN',
    });
    expect(toPackPartnerError(undefined)).toMatchObject({
      message: 'UNKNOWN',
    });
  });
});

describe('toErrorState', () => {
  it('persists only the code', () => {
    const state = toErrorState(
      createPackPartnerError({
        code: 'RATE_LIMITED',
        context: 'POST /generatePack',
        status: 429,
      }),
    );

    expect(state).toEqual({ code: 'RATE_LIMITED' });
  });

  it('discards messages and payloads on arbitrary errors', () => {
    const state = toErrorState(
      Object.assign(new Error('private-transaction'), {
        cause: { transaction: 'private-transaction' },
      }),
    );

    expect(state).toEqual({ code: 'UNKNOWN' });
  });

  it('normalizes an error shaped like a PackPartner error', () => {
    const external = Object.assign(new Error('private-transaction'), {
      name: 'PackPartnerError',
      code: 'SUBMIT_FAILED',
      retryable: true,
      status: 500,
      context: 'private-transaction',
      cause: { transaction: 'private-transaction' },
    });

    const error = toPackPartnerError(external);

    expect(error.message).toBe('SUBMIT_FAILED (HTTP 500)');
    expect(error).not.toHaveProperty('cause');
    expect(error).not.toHaveProperty('context');
    expect(toErrorState(error)).toEqual({ code: 'SUBMIT_FAILED' });
  });
});

describe('isFetchNetworkError', () => {
  it.each([
    [
      'an AbortError',
      Object.assign(new Error('Aborted'), { name: 'AbortError' }),
    ],
    ['a React Native network failure', new TypeError('Network request failed')],
    ['a browser network failure', new TypeError('Failed to fetch')],
  ])('accepts %s', (_, error) => {
    expect(isFetchNetworkError(error)).toBe(true);
  });

  it.each([
    [
      'a programming TypeError',
      new TypeError("Cannot read properties of undefined (reading 'x')"),
    ],
    ['a plain Error', new Error('Network request failed')],
    ['a string', 'Network request failed'],
  ])('rejects %s', (_, error) => {
    expect(isFetchNetworkError(error)).toBe(false);
  });
});
