import { strings } from '../../../../../../../locales/i18n';
import { createPackPartnerError } from '../services/errors';
import {
  getPackPartnerErrorCode,
  getPackPartnerErrorMessage,
  getErrorMessageFromUnknown,
} from './errorMessages';

describe('errorMessages', () => {
  it('reads the code of thrown errors and stored error states', () => {
    expect(
      getPackPartnerErrorCode(
        createPackPartnerError({ code: 'SUBMIT_FAILED' }),
      ),
    ).toBe('SUBMIT_FAILED');
    expect(getPackPartnerErrorCode({ code: 'OPEN_PENDING' })).toBe(
      'OPEN_PENDING',
    );
  });

  it('falls back to UNKNOWN', () => {
    expect(getPackPartnerErrorCode(new Error('boom'))).toBe('UNKNOWN');
    expect(getPackPartnerErrorCode({ code: 'OTHER' })).toBe('UNKNOWN');
    expect(getPackPartnerErrorCode(undefined)).toBe('UNKNOWN');
  });

  it.each([
    ['CONFIGURATION_ERROR', 'collectibles.errors.configuration_error'],
    ['PACK_EXPIRED', 'collectibles.errors.pack_expired'],
    ['OFFER_CHANGED', 'collectibles.errors.offer_changed'],
  ] as const)('localizes %s', (code, key) => {
    const message = getPackPartnerErrorMessage(code);

    expect(message).toBe(strings(key));
    expect(message).not.toContain(key);
  });

  it('localizes a missing code as unknown', () => {
    expect(getPackPartnerErrorMessage(undefined)).toBe(
      'An unexpected error occurred.',
    );
  });

  it('never shows raw error messages', () => {
    expect(getErrorMessageFromUnknown(new Error('secret stack'))).toBe(
      'An unexpected error occurred.',
    );
  });
});
