import { getChoosePasswordFlow } from './getChoosePasswordFlow';

describe('getChoosePasswordFlow', () => {
  it('returns recovery_reset when passwordlessSocialRecovery is true', () => {
    expect(
      getChoosePasswordFlow({
        passwordlessSocialRecovery: true,
        oauthLoginSuccess: true,
      }),
    ).toBe('recovery_reset');
  });

  it('returns recovery_reset without an oauth login flag', () => {
    expect(getChoosePasswordFlow({ passwordlessSocialRecovery: true })).toBe(
      'recovery_reset',
    );
  });

  it('returns social_create when the oauth login succeeded', () => {
    expect(
      getChoosePasswordFlow({
        oauthLoginSuccess: true,
        passwordlessSocialRecovery: false,
      }),
    ).toBe('social_create');
  });

  it('returns srp_create when oauthLoginSuccess is false', () => {
    expect(getChoosePasswordFlow({ oauthLoginSuccess: false })).toBe(
      'srp_create',
    );
  });

  it('returns srp_create when params are undefined', () => {
    expect(getChoosePasswordFlow(undefined)).toBe('srp_create');
  });
});
