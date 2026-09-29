import { prefixError } from './error-prefix';

const PREFIX = 'MyModule: ';

const VERBOSE_ETHERS_MESSAGE =
  'call revert exception (method="previewDeposit(address,uint256,address,address)", errorArgs=["Test Error 123"], reason="Test Error 123", code=CALL_EXCEPTION)';

function makeCallException(overrides?: Record<string, unknown>) {
  return Object.assign(new Error(VERBOSE_ETHERS_MESSAGE), {
    code: 'CALL_EXCEPTION',
    reason: 'Test Error 123',
    method: 'previewDeposit(address,uint256,address,address)',
    errorArgs: ['Test Error 123'],
    errorName: 'Error',
    errorSignature: 'Error(string)',
    ...overrides,
  });
}

describe('prefixError', () => {
  describe('plain Error', () => {
    it('prepends the prefix to the message', () => {
      const result = prefixError(new Error('something went wrong'), PREFIX);
      expect(result.message).toBe('MyModule: something went wrong');
    });

    it('does not double-prepend when prefix is already present', () => {
      const result = prefixError(
        new Error('MyModule: already prefixed'),
        PREFIX,
      );
      expect(result.message).toBe('MyModule: already prefixed');
    });

    it('returns the same Error instance', () => {
      const error = new Error('oops');
      expect(prefixError(error, PREFIX)).toBe(error);
    });
  });

  describe('non-Error value', () => {
    it('wraps a string in a new Error with the prefix', () => {
      const result = prefixError('raw string error', PREFIX);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('MyModule: raw string error');
    });

    it('wraps an object via String()', () => {
      const result = prefixError({ foo: 'bar' }, PREFIX);
      expect(result.message).toBe('MyModule: [object Object]');
    });
  });

  describe('CALL_EXCEPTION error', () => {
    it('formats as "eth_call failed - method - reason"', () => {
      const result = prefixError(makeCallException(), PREFIX);
      expect(result.message).toBe(
        'MyModule: eth_call failed - previewDeposit - Test Error 123',
      );
    });

    it('uses 4-byte selector when method is absent', () => {
      const error = Object.assign(new Error(VERBOSE_ETHERS_MESSAGE), {
        code: 'CALL_EXCEPTION',
        reason: 'Test Error 123',
        transaction: { data: '0xaa03f2e8000000000000' },
      });
      expect(prefixError(error, PREFIX).message).toBe(
        'MyModule: eth_call failed - 0xaa03f2e8',
      );
    });

    it('returns "eth_call failed" when neither method nor transaction.data is present', () => {
      const error = Object.assign(new Error(VERBOSE_ETHERS_MESSAGE), {
        code: 'CALL_EXCEPTION',
        reason: 'Test Error 123',
      });
      expect(prefixError(error, PREFIX).message).toBe(
        'MyModule: eth_call failed',
      );
    });

    it('does not double-prepend the same prefix on a second call', () => {
      const error = makeCallException();
      prefixError(error, PREFIX);
      prefixError(error, PREFIX);
      expect(error.message).toBe(
        'MyModule: eth_call failed - previewDeposit - Test Error 123',
      );
    });

    it('chains prefixes correctly across two calls', () => {
      const error = makeCallException();
      prefixError(error, 'Inner: ');
      prefixError(error, 'Outer: ');
      expect(error.message).toBe(
        'Outer: Inner: eth_call failed - previewDeposit - Test Error 123',
      );
    });

    it('preserves an externally-applied prefix (no verbose marker)', () => {
      const error = makeCallException();
      error.message = 'External: Test Error 123';
      expect(prefixError(error, PREFIX).message).toBe(
        'MyModule: External: Test Error 123',
      );
    });

    it('formats as "eth_call failed - method" when reason is absent but method is present', () => {
      const error = Object.assign(new Error(VERBOSE_ETHERS_MESSAGE), {
        code: 'CALL_EXCEPTION',
        method: 'previewDeposit(address,uint256,address,address)',
      });
      expect(prefixError(error, PREFIX).message).toBe(
        'MyModule: eth_call failed - previewDeposit',
      );
    });

    it('returns "eth_call failed" when reason is absent and neither method nor transaction.data is present', () => {
      const error = Object.assign(new Error(VERBOSE_ETHERS_MESSAGE), {
        code: 'CALL_EXCEPTION',
      });
      expect(prefixError(error, PREFIX).message).toBe(
        'MyModule: eth_call failed',
      );
    });

    it('formats as "eth_call failed - method" when reason is not a string', () => {
      expect(
        prefixError(makeCallException({ reason: 42 }), PREFIX).message,
      ).toBe('MyModule: eth_call failed - previewDeposit');
    });
  });
});
