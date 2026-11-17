import { MFA_CONFIG, type MfaConfig } from './mfa-config';
import {
  getCubistConfig,
  getToprfRecoveryConfig,
  isMfaRecoveryConfigured,
  tryGetCubistEscrowConfig,
} from './config';
import { DEFAULT_REGISTRATION_URL } from './constants';
import { MfaRecoveryControllerError } from './errors';

const VALID_KEY =
  '0x91b234f1b63c64a951eebde8d4e514db4ee9e10078958032dca6f0bb3567190a';

const createValidConfig = (overrides: Partial<MfaConfig> = {}): MfaConfig => ({
  ...MFA_CONFIG.dev,
  ...overrides,
});

describe('getCubistConfig', () => {
  it('returns the Cubist escrow configuration', () => {
    const config = getCubistConfig(createValidConfig());

    expect(config.environment).toBe('gamma');
    expect(config.orgId).toBe(MFA_CONFIG.dev.orgId);
    expect(config.wrapPublicKey).toHaveLength(32);
    expect(config.receiptPublicKey).toHaveLength(32);
    expect(config.scopes).toEqual([
      'manage:policy:get',
      'manage:policy:invoke',
    ]);
    expect(config.registrationUrl).toBe(MFA_CONFIG.dev.registrationUrl);
    expect(config.authAudience).toBe(MFA_CONFIG.dev.cubistAuthAudience);
  });

  it('falls back to the default registration URL when blank', () => {
    const config = getCubistConfig(
      createValidConfig({ registrationUrl: '   ' }),
    );

    expect(config.registrationUrl).toBe(DEFAULT_REGISTRATION_URL);
  });

  it('rejects an unsupported Cubist environment', () => {
    expect(() =>
      getCubistConfig(createValidConfig({ cubistEnvironment: 'staging' })),
    ).toThrow(
      new MfaRecoveryControllerError(
        'MFA_CONFIG.cubistEnvironment must be beta, gamma, or prod',
        'invalid_configuration',
      ),
    );
  });

  it('rejects a missing required field', () => {
    expect(() => getCubistConfig(createValidConfig({ orgId: '  ' }))).toThrow(
      new MfaRecoveryControllerError(
        'MFA_CONFIG.orgId is not configured',
        'missing_configuration',
      ),
    );
  });

  it('rejects a public key that is not 32 raw bytes', () => {
    expect(() =>
      getCubistConfig(createValidConfig({ wrapPublicKey: '0xabcd' })),
    ).toThrow(
      new MfaRecoveryControllerError(
        'MFA_CONFIG.wrapPublicKey must be a 0x-prefixed raw 32-byte public key',
        'invalid_configuration',
      ),
    );
  });

  it('rejects a non-hex public key', () => {
    expect(() =>
      getCubistConfig(createValidConfig({ receiptPublicKey: 'not-hex' })),
    ).toThrow(MfaRecoveryControllerError);
  });

  it('rejects empty session scopes', () => {
    expect(() =>
      getCubistConfig(createValidConfig({ sessionScopes: ' ,  , ' })),
    ).toThrow(
      new MfaRecoveryControllerError(
        'MFA_CONFIG.sessionScopes must not be empty',
        'invalid_configuration',
      ),
    );
  });

  it.each(['beta', 'gamma', 'prod'] as const)(
    'accepts the %s Cubist environment',
    (environment) => {
      expect(
        getCubistConfig(createValidConfig({ cubistEnvironment: environment }))
          .environment,
      ).toBe(environment);
    },
  );
});

describe('getToprfRecoveryConfig', () => {
  it('returns the TOPRF recovery audiences and verifier IDs', () => {
    expect(getToprfRecoveryConfig(createValidConfig())).toEqual({
      aal2Audience: MFA_CONFIG.dev.toprfAal2Audience,
      authConnectionId: MFA_CONFIG.dev.toprfRecoveryAuthConnectionId,
      groupedAuthConnectionId:
        MFA_CONFIG.dev.toprfRecoveryGroupedAuthConnectionId,
    });
  });

  it('rejects a missing TOPRF audience', () => {
    expect(() =>
      getToprfRecoveryConfig(createValidConfig({ toprfAal2Audience: '' })),
    ).toThrow(MfaRecoveryControllerError);
  });
});

describe('tryGetCubistEscrowConfig', () => {
  it('returns the escrow keys when configuration is valid', () => {
    const config = tryGetCubistEscrowConfig(createValidConfig());

    expect(config.wrapPublicKey).toHaveLength(32);
    expect(config.receiptPublicKey).toHaveLength(32);
    expect(config.authAudience).toBe(MFA_CONFIG.dev.cubistAuthAudience);
  });

  it('returns empty values when configuration is invalid', () => {
    const config = tryGetCubistEscrowConfig(
      createValidConfig({ wrapPublicKey: VALID_KEY.slice(0, 10) }),
    );

    expect(config.wrapPublicKey).toEqual(new Uint8Array());
    expect(config.receiptPublicKey).toEqual(new Uint8Array());
    expect(config.authAudience).toBe('');
  });
});

describe('isMfaRecoveryConfigured', () => {
  it('returns true when Cubist and TOPRF configs are complete', () => {
    expect(isMfaRecoveryConfigured(createValidConfig())).toBe(true);
  });

  it('returns false when Cubist config is incomplete', () => {
    expect(isMfaRecoveryConfigured(createValidConfig({ orgId: '' }))).toBe(
      false,
    );
  });

  it('returns false when TOPRF config is incomplete', () => {
    expect(
      isMfaRecoveryConfigured(
        createValidConfig({ toprfRecoveryAuthConnectionId: '' }),
      ),
    ).toBe(false);
  });
});
