import { getCubistConfig, isMfaRecoveryConfigured } from './config';

const originalEnv = { ...process.env };

describe('MFA recovery configuration', () => {
  beforeEach(() => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    process.env.MFA_RECOVERY_DEV_API_KEY = 'api-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('parses the configured Cubist values', () => {
    expect(getCubistConfig()).toEqual({
      environment: 'gamma',
      orgId: 'Org#5eade91b-cd05-4af6-a974-77f63cc344f6',
      wrapPublicKey:
        '{"kty":"EC","crv":"P-256","x":"foxf_AOcFNGsgnoxVHOEJhKj2cJ8nSOc2k0nMhlg2Jg","y":"yPOdEM3E-xpMuz0vaB9yjWoSixzDfTIrrmuTkmr4ePg"}',
      receiptPublicKey:
        '{"kty":"EC","crv":"P-256","x":"t9qe4__2l7ypZGjcQFBW29TaIU_04JXDvOzK9fNBsmM","y":"j-jWICPw4zUbiJaR9AO_PwmhN-mzYICgfPi-TxLhZS8"}',
      scopes: ['manage:policy:get', 'manage:policy:invoke'],
      registrationUrl: 'https://recovery-registration.dev-api.cx.metamask.io',
      mpcApiKey: 'api-key',
    });
    expect(isMfaRecoveryConfigured()).toBe(true);
  });

  it('reports false instead of throwing when a value is missing', () => {
    process.env.MFA_RECOVERY_DEV_API_KEY = '';

    expect(isMfaRecoveryConfigured()).toBe(false);
  });

  it('reports false when the selected configuration set is empty', () => {
    process.env.METAMASK_ENVIRONMENT = 'production';

    expect(() => getCubistConfig()).toThrow('MFA_CONFIG');
    expect(isMfaRecoveryConfigured()).toBe(false);
  });
});
