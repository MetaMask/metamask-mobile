import { strings } from '../../../../../../../locales/i18n';
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

  it.each([
    ['PACK_EXPIRED', 'gacha.errors.pack_expired'],
    ['OFFER_CHANGED', 'gacha.errors.offer_changed'],
  ] as const)('localizes %s', (code, key) => {
    const message = getCollectorCryptErrorMessage(code);

    expect(message).toBe(strings(key));
    expect(message).not.toContain(key);
  });

  it('localizes a missing code as unknown', () => {
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
