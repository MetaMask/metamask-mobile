import { getCubistConfig, isMfaRecoveryConfigured } from './config';

const originalEnv = { ...process.env };

describe('MFA recovery configuration', () => {
  beforeEach(() => {
    process.env.MM_CUBIST_ENV = 'gamma';
    process.env.MM_CUBIST_ORG_ID = 'org-1';
    process.env.MM_CUBIST_WRAP_PUBLIC_KEY = '{"kty":"EC"}';
    process.env.MM_CUBIST_RECEIPT_PUBLIC_KEY = '{"kty":"EC"}';
    process.env.MM_CUBIST_SESSION_SCOPES = 'manage:*, read:*';
    process.env.MM_RECOVERY_REGISTRATION_URL =
      'https://recovery-registration.test';
    process.env.MFA_RECOVERY_DEV_API_KEY = 'api-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('parses the configured Cubist values', () => {
    expect(getCubistConfig()).toEqual({
      environment: 'gamma',
      orgId: 'org-1',
      wrapPublicKey: '{"kty":"EC"}',
      receiptPublicKey: '{"kty":"EC"}',
      scopes: ['manage:*', 'read:*'],
      registrationUrl: 'https://recovery-registration.test',
      mpcApiKey: 'api-key',
    });
    expect(isMfaRecoveryConfigured()).toBe(true);
  });

  it('reports false instead of throwing when a value is missing', () => {
    process.env.MM_CUBIST_WRAP_PUBLIC_KEY = '';

    expect(isMfaRecoveryConfigured()).toBe(false);
  });

  it('rejects invalid environments and empty scopes', () => {
    process.env.MM_CUBIST_ENV = 'local';
    expect(() => getCubistConfig()).toThrow('MM_CUBIST_ENV');

    process.env.MM_CUBIST_ENV = 'gamma';
    process.env.MM_CUBIST_SESSION_SCOPES = ' , ';
    expect(() => getCubistConfig()).toThrow('MM_CUBIST_SESSION_SCOPES');
  });
});
