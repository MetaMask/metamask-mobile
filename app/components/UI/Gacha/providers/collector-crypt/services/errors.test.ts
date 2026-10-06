import { HttpError } from '../../../services/http';
import {
  createCollectorCryptError,
  isCollectorCryptError,
  isCollectorCryptErrorCode,
  toCollectorCryptError,
  toErrorState,
} from './errors';

describe('createCollectorCryptError', () => {
  it('builds an Error with the code, status and cause', () => {
    const cause = new Error('boom');

    const error = createCollectorCryptError({
      code: 'SUBMIT_FAILED',
      message: 'failed',
      status: 500,
      retryable: true,
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'CollectorCryptError',
      code: 'SUBMIT_FAILED',
      message: 'failed',
      status: 500,
      retryable: true,
      cause,
    });
  });

  it.each([
    ['NETWORK_ERROR', true],
    ['RATE_LIMITED', true],
    ['OPEN_PENDING', true],
    ['SIGNING_REJECTED', false],
    ['UNKNOWN', false],
  ] as const)('defaults retryable for %s to %s', (code, retryable) => {
    const error = createCollectorCryptError({ code });

    expect(error.retryable).toBe(retryable);
    expect(error.message).toBe(code);
  });

  it('omits status and cause when not provided', () => {
    const error = createCollectorCryptError({ code: 'UNKNOWN' });

    expect('status' in error).toBe(false);
    expect('cause' in error).toBe(false);
  });
});

describe('isCollectorCryptError', () => {
  it('recognizes created errors', () => {
    expect(
      isCollectorCryptError(createCollectorCryptError({ code: 'NOT_FOUND' })),
    ).toBe(true);
  });

  it.each([
    ['a plain Error', new Error('x')],
    [
      'a plain object',
      { name: 'CollectorCryptError', code: 'UNKNOWN', retryable: false },
    ],
    [
      'an unknown code',
      Object.assign(new Error('x'), {
        name: 'CollectorCryptError',
        code: 'NOPE',
        retryable: false,
      }),
    ],
    ['null', null],
  ])('rejects %s', (_, value) => {
    expect(isCollectorCryptError(value)).toBe(false);
  });
});

describe('isCollectorCryptErrorCode', () => {
  it('accepts known codes only', () => {
    expect(isCollectorCryptErrorCode('PACK_EXPIRED')).toBe(true);
    expect(isCollectorCryptErrorCode('toString')).toBe(false);
    expect(isCollectorCryptErrorCode(1)).toBe(false);
  });
});

describe('toCollectorCryptError', () => {
  it.each([
    ['NETWORK_ERROR', undefined, true],
    ['RATE_LIMITED', 429, true],
    ['INVALID_RESPONSE', 200, false],
    ['UNKNOWN', 503, true],
  ] as const)(
    'preserves a shared HTTP %s error at the provider boundary',
    (code, status, retryable) => {
      const cause = new HttpError({
        code,
        message: 'API failure',
        status,
        retryable,
      });

      const error = toCollectorCryptError(cause, 'SUBMIT_FAILED');

      expect(error).toMatchObject({
        name: 'CollectorCryptError',
        code,
        message: 'API failure',
        retryable,
        cause,
      });
      expect(error.status).toBe(status);
    },
  );

  it('passes CollectorCrypt errors through', () => {
    const error = createCollectorCryptError({ code: 'PACK_FAILED' });

    expect(toCollectorCryptError(error, 'UNKNOWN')).toBe(error);
  });

  it('maps fetch failures to a retryable NETWORK_ERROR', () => {
    const cause = new TypeError('Network request failed');

    const error = toCollectorCryptError(cause, 'SUBMIT_FAILED');

    expect(error).toMatchObject({
      code: 'NETWORK_ERROR',
      retryable: true,
      message: 'Network request failed',
      cause,
    });
  });

  it('uses the fallback code for other errors', () => {
    const error = toCollectorCryptError(new Error('odd'), 'SIGNING_REJECTED');

    expect(error).toMatchObject({
      code: 'SIGNING_REJECTED',
      retryable: false,
      message: 'odd',
    });
  });

  it('defaults to UNKNOWN and reads string and object messages', () => {
    expect(toCollectorCryptError('bad')).toMatchObject({
      code: 'UNKNOWN',
      message: 'bad',
    });
    expect(toCollectorCryptError({ message: 'rpc' })).toMatchObject({
      message: 'rpc',
    });
    expect(toCollectorCryptError(undefined)).toMatchObject({
      message: 'UNKNOWN',
    });
  });
});

describe('toErrorState', () => {
  it('keeps the code and message', () => {
    const state = toErrorState(
      createCollectorCryptError({
        code: 'RATE_LIMITED',
        message: 'Too many pending packs',
      }),
    );

    expect(state).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many pending packs',
    });
  });

  it('omits a message equal to the code', () => {
    expect(
      toErrorState(createCollectorCryptError({ code: 'OPEN_PENDING' })),
    ).toEqual({
      code: 'OPEN_PENDING',
    });
  });

  it('serializes unknown values', () => {
    const state = toErrorState(new Error('boom'));

    expect(state).toEqual({ code: 'UNKNOWN', message: 'boom' });
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
