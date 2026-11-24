import type { Environment, Scope } from '@cubist-labs/cubesigner-sdk';
import { hexToBytes, isStrictHexString } from '@metamask/utils';
import { MfaRecoveryControllerError } from './errors';

/** SIWE domain accepted by the recovery escrow identifier policy. */
export const SIWE_DOMAIN = 'metamask.io';

/** SIWE chain ID accepted by the recovery escrow identifier policy. */
export const SIWE_CHAIN_ID = 1;

/** Length in bytes of the Recovery Secret held in escrow. */
export const RECOVERY_SECRET_LENGTH = 32;

export type MfaConfigKey = 'dev' | 'uat' | 'prod';

export interface MfaConfig {
  cubistEnvironment: string;
  orgId: string;
  wrapPublicKey: string;
  receiptPublicKey: string;
  sessionScopes: string;
  registrationUrl: string;
  /** Audience Cubist accepts on Auth approvals. */
  cubistAuthAudience: string;
  /** Audience the TOPRF nodes accept on the aal2 token. */
  toprfAal2Audience: string;
  /** TOPRF recovery sub-verifier ID. */
  toprfRecoveryAuthConnectionId: string;
  /** TOPRF recovery aggregate verifier ID. */
  toprfRecoveryGroupedAuthConnectionId: string;
}

const EMPTY_MFA_CONFIG: MfaConfig = {
  cubistEnvironment: '',
  orgId: '',
  wrapPublicKey: '',
  receiptPublicKey: '',
  sessionScopes: '',
  registrationUrl: '',
  cubistAuthAudience: '',
  toprfAal2Audience: '',
  toprfRecoveryAuthConnectionId: '',
  toprfRecoveryGroupedAuthConnectionId: '',
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
    cubistAuthAudience: 'gamma.signer.cubist.dev',
    toprfAal2Audience: 'dev-node.web3auth.io',
    toprfRecoveryAuthConnectionId: 'mm-recovery-dev-aal2-common',
    toprfRecoveryGroupedAuthConnectionId: 'mm-recovery-aal2-dev',
  },
  uat: EMPTY_MFA_CONFIG,
  prod: EMPTY_MFA_CONFIG,
};

/** Default recovery registration service endpoint. */
export const DEFAULT_REGISTRATION_URL = MFA_CONFIG.dev.registrationUrl;

/** Resolves the MFA configuration set from the MetaMask build environment. */
export function resolveMfaConfigKey(
  environment = process.env.METAMASK_ENVIRONMENT,
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

export interface CubistConfig {
  environment: Environment;
  orgId: string;
  wrapPublicKey: Uint8Array;
  receiptPublicKey: Uint8Array;
  scopes: Scope[];
  registrationUrl: string;
  authAudience: string;
}

export interface ToprfRecoveryConfig {
  aal2Audience: string;
  authConnectionId: string;
  groupedAuthConnectionId: string;
}

/** Returns the Cubist configuration used by the recovery escrow. */
export function getCubistConfig(
  mfaConfig: MfaConfig = getMfaConfig(),
): CubistConfig {
  const environment = getRequiredMfaConfig(
    mfaConfig.cubistEnvironment,
    'MFA_CONFIG.cubistEnvironment',
  );
  if (!isEnvironment(environment)) {
    throw new MfaRecoveryControllerError(
      'MFA_CONFIG.cubistEnvironment must be beta, gamma, or prod',
      'invalid_configuration',
    );
  }

  return {
    environment,
    orgId: getRequiredMfaConfig(mfaConfig.orgId, 'MFA_CONFIG.orgId'),
    wrapPublicKey: parseRawPublicKey(
      getRequiredMfaConfig(mfaConfig.wrapPublicKey, 'MFA_CONFIG.wrapPublicKey'),
      'MFA_CONFIG.wrapPublicKey',
    ),
    receiptPublicKey: parseRawPublicKey(
      getRequiredMfaConfig(
        mfaConfig.receiptPublicKey,
        'MFA_CONFIG.receiptPublicKey',
      ),
      'MFA_CONFIG.receiptPublicKey',
    ),
    scopes: parseScopes(mfaConfig.sessionScopes),
    registrationUrl: getRegistrationUrl(mfaConfig),
    authAudience: getRequiredMfaConfig(
      mfaConfig.cubistAuthAudience,
      'MFA_CONFIG.cubistAuthAudience',
    ),
  };
}

/** Returns the TOPRF verifier configuration of the aal2 recovery session. */
export function getToprfRecoveryConfig(
  mfaConfig: MfaConfig = getMfaConfig(),
): ToprfRecoveryConfig {
  return {
    aal2Audience: getRequiredMfaConfig(
      mfaConfig.toprfAal2Audience,
      'MFA_CONFIG.toprfAal2Audience',
    ),
    authConnectionId: getRequiredMfaConfig(
      mfaConfig.toprfRecoveryAuthConnectionId,
      'MFA_CONFIG.toprfRecoveryAuthConnectionId',
    ),
    groupedAuthConnectionId: getRequiredMfaConfig(
      mfaConfig.toprfRecoveryGroupedAuthConnectionId,
      'MFA_CONFIG.toprfRecoveryGroupedAuthConnectionId',
    ),
  };
}

export type CubistEscrowConfig = Pick<
  CubistConfig,
  'wrapPublicKey' | 'receiptPublicKey' | 'authAudience'
>;

/** Returns the recovery registration service origin. */
export function getRegistrationUrl(
  mfaConfig: MfaConfig = getMfaConfig(),
): string {
  return mfaConfig.registrationUrl.trim() || DEFAULT_REGISTRATION_URL;
}

/**
 * Returns the pinned Cubist escrow keys and audience, or empty values when the
 * configuration is missing or invalid. Empty values are never used: recovery
 * is disabled whenever {@link isMfaRecoveryConfigured} is false.
 */
export function tryGetCubistEscrowConfig(
  mfaConfig: MfaConfig = getMfaConfig(),
): CubistEscrowConfig {
  try {
    const { wrapPublicKey, receiptPublicKey, authAudience } =
      getCubistConfig(mfaConfig);
    return { wrapPublicKey, receiptPublicKey, authAudience };
  } catch {
    return {
      wrapPublicKey: new Uint8Array(),
      receiptPublicKey: new Uint8Array(),
      authAudience: '',
    };
  }
}

/** Returns whether all values required for a live recovery exist. */
export function isMfaRecoveryConfigured(
  mfaConfig: MfaConfig = getMfaConfig(),
): boolean {
  try {
    getCubistConfig(mfaConfig);
    getToprfRecoveryConfig(mfaConfig);
    return true;
  } catch {
    return false;
  }
}

function getRequiredMfaConfig(value: string, name: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new MfaRecoveryControllerError(
      `${name} is not configured`,
      'missing_configuration',
    );
  }
  return trimmedValue;
}

const RAW_PUBLIC_KEY_LENGTH = 32;

/** Parses a 0x-prefixed hex encoding of a raw 32-byte X25519/Ed25519 key. */
function parseRawPublicKey(value: string, name: string): Uint8Array {
  const bytes = isStrictHexString(value) ? hexToBytes(value) : undefined;
  if (bytes?.length !== RAW_PUBLIC_KEY_LENGTH) {
    throw new MfaRecoveryControllerError(
      `${name} must be a 0x-prefixed raw ${RAW_PUBLIC_KEY_LENGTH}-byte public key`,
      'invalid_configuration',
    );
  }
  return bytes;
}

function parseScopes(value: string): Scope[] {
  const scopes = value
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
  if (scopes.length === 0) {
    throw new MfaRecoveryControllerError(
      'MFA_CONFIG.sessionScopes must not be empty',
      'invalid_configuration',
    );
  }
  return scopes;
}

function isEnvironment(value: string): value is Environment {
  return value === 'beta' || value === 'gamma' || value === 'prod';
}
