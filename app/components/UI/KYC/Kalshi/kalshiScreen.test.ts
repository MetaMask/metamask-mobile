import { KYC_STEPS } from '@metamask/kyc-controller';
import { deriveKalshiScreen } from './kalshiScreen';

const context = { linkCodeSent: false, phoneCodeSent: false };

describe('deriveKalshiScreen', () => {
  it('shows a loading screen before kyc-api answers', () => {
    expect(deriveKalshiScreen(undefined, 'none', context)).toBe('loading');
    expect(deriveKalshiScreen(null, null, context)).toBe('loading');
  });

  it.each([
    ['vendor_terms', 'terms'],
    ['account_link', 'email'],
    ['confirm_identity', 'confirm'],
    ['identity_email_code', 'email_code'],
    ['identity_provider', 'sumsub'],
    ['error', 'error'],
  ] as const)('maps %s to the %s screen', (step, expected) => {
    expect(deriveKalshiScreen(step, 'none', context)).toBe(expected);
  });

  it('has a screen for every step kyc-api can send', () => {
    for (const step of KYC_STEPS) {
      expect(deriveKalshiScreen(step, 'none', context)).not.toBe('loading');
    }
  });

  describe('account_link', () => {
    it('asks for the email first', () => {
      expect(
        deriveKalshiScreen('account_link', 'none', {
          ...context,
          linkCodeSent: false,
        }),
      ).toBe('email');
    });

    it('then for the code, on the same step, once it was sent', () => {
      expect(
        deriveKalshiScreen('account_link', 'none', {
          ...context,
          linkCodeSent: true,
        }),
      ).toBe('link_code');
    });

    it('goes back to the email when the phone clears the code state', () => {
      // kyc-api cannot do this: it only knows the account is not linked, and
      // Kalshi never says the address was wrong. Without the phone keeping
      // this, a mistyped email would be a dead end.
      expect(
        deriveKalshiScreen('account_link', 'none', {
          ...context,
          linkCodeSent: false,
        }),
      ).toBe('email');
    });
  });

  describe('identity_phone', () => {
    it('asks for the number first', () => {
      expect(deriveKalshiScreen('identity_phone', 'none', context)).toBe(
        'phone',
      );
    });

    it('then for the code, on the same step, once it was sent', () => {
      expect(
        deriveKalshiScreen('identity_phone', 'none', {
          ...context,
          phoneCodeSent: true,
        }),
      ).toBe('phone_code');
    });

    it('forgets the code field once the step moves on', () => {
      expect(
        deriveKalshiScreen('identity_provider', 'none', {
          ...context,
          phoneCodeSent: true,
        }),
      ).toBe('sumsub');
    });
  });

  describe('a retry', () => {
    it('is the same screen as the first attempt', () => {
      expect(deriveKalshiScreen('identity_provider', 'retry', context)).toBe(
        deriveKalshiScreen('identity_provider', 'none', context),
      );
    });
  });

  describe('done', () => {
    it.each([
      ['approved', 'done'],
      ['rejected', 'rejected'],
      ['pending', 'waiting'],
      ['none', 'waiting'],
    ] as const)('shows %s as the %s screen', (status, expected) => {
      expect(deriveKalshiScreen('done', status, context)).toBe(expected);
    });
  });
});
