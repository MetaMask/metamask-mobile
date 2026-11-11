import {
  getDefaultKycVendorSessionState,
  type KycSessionStatus,
  type KycVendorSessionState,
} from '@metamask/kyc-controller';
import { deriveKalshiStep } from './kalshiStep';

const session = (
  overrides: Partial<KycSessionStatus> = {},
): KycSessionStatus => ({
  id: 'session-1',
  finalStatus: 'new',
  externalUserId: 'user-1',
  kycStatus: 'new',
  vendor: 'kalshi',
  vendorStatus: 'new',
  ...overrides,
});

const entry = (
  overrides: Partial<KycVendorSessionState> = {},
): KycVendorSessionState => ({
  ...getDefaultKycVendorSessionState(),
  ...overrides,
});

const visit = { phoneCodeSent: false };

describe('deriveKalshiStep', () => {
  describe('with a step from kyc-api', () => {
    it.each([
      ['vendor_terms', 'terms'],
      ['verify_email', 'email'],
      ['kyc_pending', 'waiting'],
      ['kyc_retry', 'sumsub'],
      ['kyc_rejected', 'rejected'],
    ] as const)('maps %s to the %s screen', (nextStep, expected) => {
      // Arrange
      const kalshi = entry({ nextStep });

      // Act
      const step = deriveKalshiStep(kalshi, visit);

      // Assert
      expect(step).toBe(expected);
    });

    it('opens SumSub for identity verification when no relay code is owed', () => {
      // Arrange
      const kalshi = entry({
        nextStep: 'identity_verification',
        sessionStatus: session({ currentStep: 'kyc' }),
      });

      // Act
      const step = deriveKalshiStep(kalshi, visit);

      // Assert
      expect(step).toBe('sumsub');
    });

    it('asks for the relay email code inside identity verification', () => {
      // Arrange
      const kalshi = entry({
        nextStep: 'identity_verification',
        sessionStatus: session({ currentStep: 'emailOtpCollection' }),
      });

      // Act
      const step = deriveKalshiStep(kalshi, visit);

      // Assert
      expect(step).toBe('email_code');
    });

    it('asks for the phone, then its code, inside identity verification', () => {
      // Arrange
      const kalshi = entry({
        nextStep: 'identity_verification',
        sessionStatus: session({ currentStep: 'phoneOtpCollection' }),
      });

      // Act
      const beforeSend = deriveKalshiStep(kalshi, visit);
      const afterSend = deriveKalshiStep(kalshi, { phoneCodeSent: true });

      // Assert
      expect(beforeSend).toBe('phone');
      expect(afterSend).toBe('phone_code');
    });

    it('moves to the Kalshi account half once approved', () => {
      // Arrange
      const linked = entry({
        nextStep: 'approved',
        vendorAccount: {
          state: 'approved',
          updatedAt: '2026-11-10T00:00:00.000Z',
        },
      });
      const fresh = entry({ nextStep: 'approved' });

      // Act
      const linkedStep = deriveKalshiStep(linked, visit);
      const freshStep = deriveKalshiStep(fresh, visit);

      // Assert
      expect(linkedStep).toBe('activate');
      expect(freshStep).toBe('link');
    });
  });

  describe('before kyc-api answers', () => {
    it('falls back to the stored entry', () => {
      // Arrange
      const noAnswer = entry();
      const errored = entry({ nextStep: 'error' });

      // Act
      const noAnswerStep = deriveKalshiStep(noAnswer, visit);
      const erroredStep = deriveKalshiStep(errored, visit);

      // Assert
      expect(noAnswerStep).toBe('terms');
      expect(erroredStep).toBe('terms');
    });
  });
});
