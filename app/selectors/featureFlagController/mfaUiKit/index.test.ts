import { selectMfaUiKitMethods } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';

describe('selectMfaUiKitMethods', () => {
  it('lists the flag methods', () => {
    expect(
      selectMfaUiKitMethods.resultFunc({
        [FeatureFlagNames.mfaUiKit]: {
          enabled: true,
          minimumVersion: '1.0.0',
          methods: ['email_otp'],
        },
      }),
    ).toStrictEqual(['email_otp']);
  });

  it('reads the methods of a progressive rollout', () => {
    expect(
      selectMfaUiKitMethods.resultFunc({
        [FeatureFlagNames.mfaUiKit]: {
          name: 'rollout',
          value: {
            enabled: true,
            minimumVersion: '1.0.0',
            methods: ['email_otp'],
          },
        },
      }),
    ).toStrictEqual(['email_otp']);
  });

  it('allows every method when the flag lists none', () => {
    expect(selectMfaUiKitMethods.resultFunc({})).toStrictEqual([
      'passkey',
      'totp',
      'email_otp',
    ]);
  });
});
