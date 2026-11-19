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
    ['terms', 'terms'],
    ['mfa', 'confirm'],
    ['kalshi_email_link', 'email_code'],
    ['kalshi_phone_link', 'phone'],
    ['sumsub', 'sumsub'],
    ['error', 'error'],
  ] as const)('maps %s to the %s screen', (step, expected) => {
    expect(deriveKalshiScreen(step, 'none', context)).toBe(expected);
  });

  it('has a screen for every step kyc-api can send', () => {
    for (const step of KYC_STEPS) {
      expect(deriveKalshiScreen(step, 'none', context)).not.toBe('loading');
    }
  });

  describe('mfa', () => {
    it('asks MetaMask to confirm first', () => {
      expect(deriveKalshiScreen('mfa', 'none', context)).toBe('confirm');
    });

    it('then asks for the Kalshi email, still before a session exists', () => {
      expect(
        deriveKalshiScreen('mfa', 'none', {
          ...context,
          emailEntry: true,
        }),
      ).toBe('email');
    });
  });

  describe('kalshi_email_link', () => {
    it('goes back to the email so a mistyped address can be signed again', () => {
      expect(
        deriveKalshiScreen('kalshi_email_link', 'none', {
          ...context,
          editingEmail: true,
        }),
      ).toBe('email');
    });
  });

  describe('kalshi_phone_link', () => {
    it('asks for the number first', () => {
      expect(deriveKalshiScreen('kalshi_phone_link', 'none', context)).toBe(
        'phone',
      );
    });

    it('then for the code, on the same step, once it was sent', () => {
      expect(
        deriveKalshiScreen('kalshi_phone_link', 'none', {
          ...context,
          phoneCodeSent: true,
        }),
      ).toBe('phone_code');
    });

    it('forgets the code field once the step moves on', () => {
      expect(
        deriveKalshiScreen('sumsub', 'none', {
          ...context,
          phoneCodeSent: true,
        }),
      ).toBe('sumsub');
    });
  });

  describe('a retry', () => {
    it('is the same screen as the first attempt', () => {
      expect(deriveKalshiScreen('sumsub', 'retry', context)).toBe(
        deriveKalshiScreen('sumsub', 'none', context),
      );
    });
  });

  describe('decision', () => {
    it.each([
      ['approved', 'done'],
      ['rejected', 'rejected'],
      ['pending', 'waiting'],
      ['none', 'waiting'],
    ] as const)('shows %s as the %s screen', (status, expected) => {
      expect(deriveKalshiScreen('decision', status, context)).toBe(expected);
    });
  });
});
