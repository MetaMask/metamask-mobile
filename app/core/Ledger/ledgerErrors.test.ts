import {
  ETH_APP_NOT_OPEN_STATUS_CODES,
  isEthAppNotOpenStatusCode,
  isEthAppNotOpenErrorMessage,
  isEthAppNotOpenError,
} from './ledgerErrors';

describe('ledgerErrors', () => {
  describe('ETH_APP_NOT_OPEN_STATUS_CODES', () => {
    it('contains all expected status codes', () => {
      expect(ETH_APP_NOT_OPEN_STATUS_CODES).toContain(0x6d00);
      expect(ETH_APP_NOT_OPEN_STATUS_CODES).toContain(0x6e00);
      expect(ETH_APP_NOT_OPEN_STATUS_CODES).toContain(0x6e01);
      expect(ETH_APP_NOT_OPEN_STATUS_CODES).toContain(0x6511);
      expect(ETH_APP_NOT_OPEN_STATUS_CODES).toContain(0x6700);
      expect(ETH_APP_NOT_OPEN_STATUS_CODES).toContain(0x650f);
    });

    it('has exactly 6 status codes', () => {
      expect(ETH_APP_NOT_OPEN_STATUS_CODES.length).toBe(6);
    });
  });

  describe('isEthAppNotOpenStatusCode', () => {
    it('returns true for 0x6d00 (CLA_NOT_SUPPORTED)', () => {
      expect(isEthAppNotOpenStatusCode(0x6d00)).toBe(true);
    });

    it('returns true for 0x6e00 (INS_NOT_SUPPORTED)', () => {
      expect(isEthAppNotOpenStatusCode(0x6e00)).toBe(true);
    });

    it('returns true for 0x6e01 (INS_NOT_SUPPORTED variant)', () => {
      expect(isEthAppNotOpenStatusCode(0x6e01)).toBe(true);
    });

    it('returns true for 0x6511 (APP_NOT_OPEN)', () => {
      expect(isEthAppNotOpenStatusCode(0x6511)).toBe(true);
    });

    it('returns true for 0x6700 (INCORRECT_LENGTH)', () => {
      expect(isEthAppNotOpenStatusCode(0x6700)).toBe(true);
    });

    it('returns true for 0x650f (UNKNOWN_ERROR)', () => {
      expect(isEthAppNotOpenStatusCode(0x650f)).toBe(true);
    });

    it('returns false for unrelated status codes', () => {
      expect(isEthAppNotOpenStatusCode(0x1234)).toBe(false);
      expect(isEthAppNotOpenStatusCode(0x9000)).toBe(false);
      expect(isEthAppNotOpenStatusCode(0x6985)).toBe(false);
      expect(isEthAppNotOpenStatusCode(0)).toBe(false);
    });
  });

  describe('isEthAppNotOpenErrorMessage', () => {
    it('returns true when message contains 0x6d00', () => {
      expect(
        isEthAppNotOpenErrorMessage(
          'TransportError: CLA_NOT_SUPPORTED (0x6d00)',
        ),
      ).toBe(true);
    });

    it('returns true when message contains 0x6e00', () => {
      expect(
        isEthAppNotOpenErrorMessage(
          'TransportError: INS_NOT_SUPPORTED (0x6e00)',
        ),
      ).toBe(true);
    });

    it('returns true when message contains 0x6e01', () => {
      expect(
        isEthAppNotOpenErrorMessage(
          'Ledger: INS_NOT_SUPPORTED variant (0x6e01)',
        ),
      ).toBe(true);
    });

    it('returns true when message contains 0x6511', () => {
      expect(
        isEthAppNotOpenErrorMessage('Ledger device: APP_NOT_OPEN (0x6511)'),
      ).toBe(true);
    });

    it('returns true when message contains 0x6700', () => {
      expect(
        isEthAppNotOpenErrorMessage('Ledger: INCORRECT_LENGTH (0x6700)'),
      ).toBe(true);
    });

    it('returns true when message contains 0x650f', () => {
      expect(
        isEthAppNotOpenErrorMessage('Ledger device: UNKNOWN_ERROR (0x650f)'),
      ).toBe(true);
    });

    it('returns true for uppercase hex codes', () => {
      expect(isEthAppNotOpenErrorMessage('Error with code 0x6D00')).toBe(true);
    });

    it('returns false for messages without matching status codes', () => {
      expect(isEthAppNotOpenErrorMessage('Some other error')).toBe(false);
      expect(isEthAppNotOpenErrorMessage('Error 0x1234')).toBe(false);
      expect(isEthAppNotOpenErrorMessage('')).toBe(false);
    });
  });

  describe('isEthAppNotOpenError', () => {
    describe('TransportStatusError handling', () => {
      it('returns true for TransportStatusError with 0x6d00', () => {
        const error = {
          name: 'TransportStatusError',
          statusCode: 0x6d00,
          message: 'Error',
        };
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns true for TransportStatusError with 0x6e00', () => {
        const error = {
          name: 'TransportStatusError',
          statusCode: 0x6e00,
          message: 'Error',
        };
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns true for TransportStatusError with 0x6e01', () => {
        const error = {
          name: 'TransportStatusError',
          statusCode: 0x6e01,
          message: 'Error',
        };
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns true for TransportStatusError with 0x6511', () => {
        const error = {
          name: 'TransportStatusError',
          statusCode: 0x6511,
          message: 'Error',
        };
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns true for TransportStatusError with 0x6700', () => {
        const error = {
          name: 'TransportStatusError',
          statusCode: 0x6700,
          message: 'Error',
        };
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns true for TransportStatusError with 0x650f', () => {
        const error = {
          name: 'TransportStatusError',
          statusCode: 0x650f,
          message: 'Error',
        };
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns false for TransportStatusError with non-matching status code', () => {
        const error = {
          name: 'TransportStatusError',
          statusCode: 0x1234,
          message: 'Error',
        };
        expect(isEthAppNotOpenError(error)).toBe(false);
      });

      it('returns false for non-TransportStatusError with statusCode property', () => {
        const error = {
          name: 'SomeOtherError',
          statusCode: 0x6d00,
          message: 'Error',
        };
        expect(isEthAppNotOpenError(error)).toBe(false);
      });
    });

    describe('Error message handling', () => {
      it('returns true for Error with message containing 0x6d00', () => {
        const error = new Error('TransportError: CLA_NOT_SUPPORTED (0x6d00)');
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns true for Error with message containing 0x6e00', () => {
        const error = new Error('TransportError: INS_NOT_SUPPORTED (0x6e00)');
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns true for Error with message containing 0x650f', () => {
        const error = new Error('Ledger device: UNKNOWN_ERROR (0x650f)');
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns true for Error with message containing 0x6511', () => {
        const error = new Error('Ledger device: APP_NOT_OPEN (0x6511)');
        expect(isEthAppNotOpenError(error)).toBe(true);
      });

      it('returns false for Error with non-matching message', () => {
        const error = new Error('Some other error');
        expect(isEthAppNotOpenError(error)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('returns false for null', () => {
        expect(isEthAppNotOpenError(null)).toBe(false);
      });

      it('returns false for undefined', () => {
        expect(isEthAppNotOpenError(undefined)).toBe(false);
      });

      it('returns false for string', () => {
        expect(isEthAppNotOpenError('error string')).toBe(false);
      });

      it('returns false for number', () => {
        expect(isEthAppNotOpenError(12345)).toBe(false);
      });

      it('returns false for empty object', () => {
        expect(isEthAppNotOpenError({})).toBe(false);
      });

      it('returns false for object without name property', () => {
        const error = {
          statusCode: 0x6d00,
          message: 'Error',
        };
        expect(isEthAppNotOpenError(error)).toBe(false);
      });

      it('returns false for object without statusCode property but with name', () => {
        const error = {
          name: 'TransportStatusError',
          message: 'Error without statusCode',
        };
        expect(isEthAppNotOpenError(error)).toBe(false);
      });
    });
  });
});
