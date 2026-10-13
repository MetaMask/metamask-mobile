import { getMfaConfig, resolveMfaConfigKey } from './mfa-config';

describe('MFA configuration selection', () => {
  it.each([
    [undefined, 'dev'],
    ['', 'dev'],
    ['dev', 'dev'],
    ['local', 'dev'],
    ['test', 'dev'],
    ['e2e', 'uat'],
    ['exp', 'uat'],
    ['production', 'prod'],
    ['beta', 'prod'],
    ['pre-release', 'prod'],
    ['rc', 'prod'],
    ['unknown', 'dev'],
  ])(
    'maps METAMASK_ENVIRONMENT=%s to the %s configuration set',
    (environment, expectedKey) => {
      expect(resolveMfaConfigKey(environment)).toBe(expectedKey);
    },
  );

  it('contains the current developer configuration values', () => {
    expect(getMfaConfig('dev')).toEqual({
      cubistEnvironment: 'gamma',
      orgId: 'Org#5eade91b-cd05-4af6-a974-77f63cc344f6',
      wrapPublicKey:
        '{"kty":"EC","crv":"P-256","x":"foxf_AOcFNGsgnoxVHOEJhKj2cJ8nSOc2k0nMhlg2Jg","y":"yPOdEM3E-xpMuz0vaB9yjWoSixzDfTIrrmuTkmr4ePg"}',
      receiptPublicKey:
        '{"kty":"EC","crv":"P-256","x":"t9qe4__2l7ypZGjcQFBW29TaIU_04JXDvOzK9fNBsmM","y":"j-jWICPw4zUbiJaR9AO_PwmhN-mzYICgfPi-TxLhZS8"}',
      sessionScopes: 'manage:policy:get,manage:policy:invoke',
      registrationUrl: 'https://recovery-registration.dev-api.cx.metamask.io',
    });
  });

  it('reads METAMASK_ENVIRONMENT at runtime when no override is provided', () => {
    const originalEnvironment = process.env.METAMASK_ENVIRONMENT;
    process.env.METAMASK_ENVIRONMENT = 'production';

    try {
      expect(getMfaConfig()).toEqual({
        cubistEnvironment: '',
        orgId: '',
        wrapPublicKey: '',
        receiptPublicKey: '',
        sessionScopes: '',
        registrationUrl: '',
      });
    } finally {
      if (originalEnvironment === undefined) {
        delete process.env.METAMASK_ENVIRONMENT;
      } else {
        process.env.METAMASK_ENVIRONMENT = originalEnvironment;
      }
    }
  });

  it.each([
    ['exp', 'uat'],
    ['production', 'prod'],
  ])('leaves the %s configuration set empty', (environment, expectedKey) => {
    expect(resolveMfaConfigKey(environment)).toBe(expectedKey);
    expect(getMfaConfig(environment)).toEqual({
      cubistEnvironment: '',
      orgId: '',
      wrapPublicKey: '',
      receiptPublicKey: '',
      sessionScopes: '',
      registrationUrl: '',
    });
  });
});
