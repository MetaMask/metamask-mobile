import { createCollectorCryptError } from '../services/errors';
import {
  getCollectorCryptErrorCode,
  getCollectorCryptErrorMessage,
  getErrorMessageFromUnknown,
} from './errorMessages';

describe('errorMessages', () => {
  it('reads the code of thrown errors and stored error states', () => {
    expect(
      getCollectorCryptErrorCode(
        createCollectorCryptError({ code: 'SUBMIT_FAILED' }),
      ),
    ).toBe('SUBMIT_FAILED');
    expect(getCollectorCryptErrorCode({ code: 'OPEN_PENDING' })).toBe(
      'OPEN_PENDING',
    );
  });

  it('falls back to UNKNOWN', () => {
    expect(getCollectorCryptErrorCode(new Error('boom'))).toBe('UNKNOWN');
    expect(getCollectorCryptErrorCode({ code: 'OTHER' })).toBe('UNKNOWN');
    expect(getCollectorCryptErrorCode(undefined)).toBe('UNKNOWN');
  });

  it('localizes error codes', () => {
    expect(getCollectorCryptErrorMessage('PACK_EXPIRED')).toBe(
      'This pack expired before the payment went through. You were not charged.',
    );
    expect(getCollectorCryptErrorMessage(undefined)).toBe(
      'An unexpected error occurred.',
    );
  });

  it('never shows raw error messages', () => {
    expect(getErrorMessageFromUnknown(new Error('secret stack'))).toBe(
      'An unexpected error occurred.',
    );
  });
});
