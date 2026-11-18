import { KYC_STEPS } from '@metamask/kyc-controller';
import { deriveKalshiScreen } from './kalshiScreen';

const context = {
  emailEntry: false,
  editingEmail: false,
  phoneCodeSent: false,
};

describe('deriveKalshiScreen', () => {
  it('shows a loading screen before kyc-api answers', () => {
    expect(deriveKalshiScreen(undefined, 'none', context)).toBe('loading');
    expect(deriveKalshiScreen(null, null, context)).toBe('loading');
  });

  it.each([
    ['vendor_terms', 'terms'],
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

  it('treats the removed account link step as an error', () => {
    expect(deriveKalshiScreen('account_link' as never, 'none', context)).toBe(
      'error',
    );
  });

  describe('confirm_identity', () => {
    it('asks MetaMask to confirm first', () => {
      expect(deriveKalshiScreen('confirm_identity', 'none', context)).toBe(
        'confirm',
      );
    });

    it('then asks for the Kalshi email, still before a session exists', () => {
      expect(
        deriveKalshiScreen('confirm_identity', 'none', {
          ...context,
          emailEntry: true,
        }),
      ).toBe('email');
    });
  });

  describe('identity_email_code', () => {
    it('goes back to the email so a mistyped address can be signed again', () => {
      expect(
        deriveKalshiScreen('identity_email_code', 'none', {
          ...context,
          editingEmail: true,
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
