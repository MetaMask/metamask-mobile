import { KYC_CURRENT_STEPS, KYC_STEPS } from '@metamask/kyc-controller';
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

  describe('identity_verification', () => {
    it('opens SumSub when idOS owes no code', () => {
      expect(
        deriveKalshiScreen('identity_verification', {
          ...context,
          relayStep: KYC_CURRENT_STEPS.kyc,
        }),
      ).toBe('sumsub');
    });

    it('opens SumSub before the relay step is known', () => {
      expect(deriveKalshiScreen('identity_verification', context)).toBe(
        'sumsub',
      );
    });

    it('asks for the email code idOS is waiting for', () => {
      expect(
        deriveKalshiScreen('identity_verification', {
          ...context,
          relayStep: KYC_CURRENT_STEPS.emailOtpCollection,
        }),
      ).toBe('email_code');
    });

    it('asks for the phone, then its code', () => {
      const relayStep = KYC_CURRENT_STEPS.phoneOtpCollection;

      expect(
        deriveKalshiScreen('identity_verification', {
          relayStep,
          phoneCodeSent: false,
        }),
      ).toBe('phone');
      expect(
        deriveKalshiScreen('identity_verification', {
          relayStep,
          phoneCodeSent: true,
        }),
      ).toBe('phone_code');
    });

    it('ignores the relay step once kyc-api has moved on', () => {
      expect(
        deriveKalshiScreen('kyc_pending', {
          relayStep: KYC_CURRENT_STEPS.emailOtpCollection,
          phoneCodeSent: false,
        }),
      ).toBe('waiting');
    });
  });
});
