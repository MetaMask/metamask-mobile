export type MfaConfigKey = 'dev' | 'uat' | 'prod';

export interface MfaConfig {
  cubistEnvironment: string;
  orgId: string;
  wrapPublicKey: string;
  receiptPublicKey: string;
  sessionScopes: string;
  registrationUrl: string;
}

const EMPTY_MFA_CONFIG: MfaConfig = {
  cubistEnvironment: '',
  orgId: '',
  wrapPublicKey: '',
  receiptPublicKey: '',
  sessionScopes: '',
  registrationUrl: '',
};

/** Configuration sets used by the MFA recovery integration. */
export const MFA_CONFIG: Record<MfaConfigKey, MfaConfig> = {
  dev: {
    cubistEnvironment: 'gamma',
    orgId: 'Org#5eade91b-cd05-4af6-a974-77f63cc344f6',
    wrapPublicKey:
      '0x91b234f1b63c64a951eebde8d4e514db4ee9e10078958032dca6f0bb3567190a',
    receiptPublicKey:
      '0xd320d2865dd4c70b6c532f2fc23e4c3b3381f431dc5a73967f4bbbc3c32272d8',
    sessionScopes: 'manage:policy:get,manage:policy:invoke',
    registrationUrl: 'https://recovery-registration.dev-api.cx.metamask.io',
  },
  uat: EMPTY_MFA_CONFIG,
  prod: EMPTY_MFA_CONFIG,
};

/**
 * Resolves the MFA configuration set from the MetaMask build environment.
 */
export function resolveMfaConfigKey(
  environment = readMfaEnvironment(),
): MfaConfigKey {
  switch (environment) {
    case 'e2e':
    case 'exp':
      return 'uat';
    case 'production':
    case 'beta':
    case 'pre-release':
    case 'rc':
      return 'prod';
    case 'dev':
    case 'local':
    case 'test':
    default:
      return 'dev';
  }
}

/** Returns the MFA configuration set for the current MetaMask environment. */
export function getMfaConfig(environment?: string): MfaConfig {
  return MFA_CONFIG[resolveMfaConfigKey(environment)];
}

function readMfaEnvironment(): string | undefined {
  // Bracket access keeps the environment lookup runtime-configurable in tests.
  // eslint-disable-next-line dot-notation
  const runtimeValue = process.env['METAMASK_ENVIRONMENT'];
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined
  ) {
    return runtimeValue;
  }
  if (runtimeValue !== undefined) {
    return runtimeValue;
  }
  return process.env.METAMASK_ENVIRONMENT;
}
