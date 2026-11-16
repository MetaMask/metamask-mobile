import { KYC_STEPS } from '@metamask/kyc-controller';
import { deriveKalshiScreen } from './kalshiScreen';

const context = { phoneCodeSent: false };

describe('deriveKalshiScreen', () => {
  it('shows a loading screen before kyc-api answers', () => {
    expect(deriveKalshiScreen(undefined, context)).toBe('loading');
  });

  it.each([
    ['vendor_terms', 'terms'],
    ['account_link', 'email'],
    ['account_link_code', 'link_code'],
    ['confirm_identity', 'confirm'],
    ['identity_email_code', 'email_code'],
    ['identity_provider', 'sumsub'],
    ['kyc_retry', 'sumsub'],
    ['kyc_pending', 'waiting'],
    ['kyc_rejected', 'rejected'],
    ['approved', 'done'],
    ['error', 'error'],
  ] as const)('maps %s to the %s screen', (step, expected) => {
    expect(deriveKalshiScreen(step, context)).toBe(expected);
  });

  it('has a screen for every step kyc-api can send', () => {
    for (const step of KYC_STEPS) {
      expect(deriveKalshiScreen(step, context)).not.toBe('loading');
    }
  });

  describe('identity_phone', () => {
    it('asks for the number first', () => {
      expect(
        deriveKalshiScreen('identity_phone', { phoneCodeSent: false }),
      ).toBe('phone');
    });

    it('then for the code, on the same step, once it was sent', () => {
      expect(
        deriveKalshiScreen('identity_phone', { phoneCodeSent: true }),
      ).toBe('phone_code');
    });

    it('forgets the code field once the step moves on', () => {
      expect(
        deriveKalshiScreen('identity_provider', { phoneCodeSent: true }),
      ).toBe('sumsub');
    });
  });
});
