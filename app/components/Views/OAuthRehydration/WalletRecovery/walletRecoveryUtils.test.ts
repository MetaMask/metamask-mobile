import type { VerificationToken } from '@metamask/profile-sync-controller/sdk';
import { strings } from '../../../../../locales/i18n';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import { PasswordlessRecoveryError } from '../../../../core/MfaRecovery/passwordlessSocialRecovery';
import {
  biometricAuthTypeFor,
  describeRecoveryError,
  isHeldAal2Valid,
  labelForBiometryType,
  offersDeviceBiometrics,
} from './walletRecoveryUtils';

const buildToken = (obtainedAt: number, expiresIn: number) =>
  ({ accessToken: 'aal2', obtainedAt, expiresIn }) as VerificationToken;

describe('walletRecoveryUtils', () => {
  describe('labelForBiometryType', () => {
    it.each([
      ['FaceID', strings('authentication.labels.face_id')],
      ['TouchID', strings('authentication.labels.touch_id')],
      ['Fingerprint', strings('wallet_recovery_mfa.biometry_fingerprint')],
      ['Iris', strings('authentication.labels.device_authentication')],
      [null, strings('authentication.labels.device_authentication')],
      [undefined, strings('authentication.labels.device_authentication')],
    ])('returns the label for %s', (biometryType, expected) => {
      expect(labelForBiometryType(biometryType)).toBe(expected);
    });
  });

  describe('isHeldAal2Valid', () => {
    it('returns false without a token', () => {
      expect(isHeldAal2Valid(null)).toBe(false);
    });

    it('returns true before the token expires', () => {
      expect(isHeldAal2Valid(buildToken(Date.now(), 60))).toBe(true);
    });

    it('returns false once the token expired', () => {
      expect(isHeldAal2Valid(buildToken(Date.now() - 120_000, 60))).toBe(false);
    });
  });

  describe('offersDeviceBiometrics', () => {
    it('returns true when a biometry type is available', () => {
      expect(
        offersDeviceBiometrics({
          currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          availableBiometryType: 'FaceID' as never,
        }),
      ).toBe(true);
    });

    it.each([
      AUTHENTICATION_TYPE.BIOMETRIC,
      AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
    ])('returns true for %s', (currentAuthType) => {
      expect(offersDeviceBiometrics({ currentAuthType })).toBe(true);
    });

    it('returns false for password without biometry', () => {
      expect(
        offersDeviceBiometrics({
          currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        }),
      ).toBe(false);
    });
  });

  describe('biometricAuthTypeFor', () => {
    it.each([
      [AUTHENTICATION_TYPE.BIOMETRIC, AUTHENTICATION_TYPE.BIOMETRIC],
      [
        AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
        AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
      ],
      [AUTHENTICATION_TYPE.PASSWORD, AUTHENTICATION_TYPE.BIOMETRIC],
    ])('maps %s to %s', (currentAuthType, expected) => {
      expect(biometricAuthTypeFor(currentAuthType)).toBe(expected);
    });
  });

  describe('describeRecoveryError', () => {
    it('returns the stage, code, and detail of a recovery error', () => {
      const error = new PasswordlessRecoveryError(
        'recovering_secrets',
        Object.assign(new Error('failed'), { code: 'write_failed' }),
        'recovering_vault',
      );

      expect(describeRecoveryError(error)).toStrictEqual({
        stage: 'recovering_secrets',
        code: 'write_failed',
        detail: 'recovering_vault; Error: failed',
      });
    });

    it('returns only the code of other errors', () => {
      expect(
        describeRecoveryError(
          Object.assign(new Error('failed'), { code: 'not_found' }),
        ),
      ).toStrictEqual({ code: 'not_found' });
    });
  });
});
