import type { Environment, Scope } from '@cubist-labs/cubesigner-sdk';
import { hexToBytes, isStrictHexString } from '@metamask/utils';
import { DEFAULT_REGISTRATION_URL } from './constants';
import { MfaRecoveryControllerError } from './errors';
import { getMfaConfig } from './mfa-config';

export interface CubistConfig {
  environment: Environment;
  orgId: string;
  wrapPublicKey: Uint8Array;
  receiptPublicKey: Uint8Array;
  scopes: Scope[];
  registrationUrl: string;
}

/** Returns the Cubist configuration used by the recovery service. */
export function getCubistConfig(): CubistConfig {
  const mfaConfig = getMfaConfig();
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

  const config: CubistConfig = {
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
    registrationUrl: mfaConfig.registrationUrl || DEFAULT_REGISTRATION_URL,
  };

  return config;
}

export type CubistKeys = Pick<
  CubistConfig,
  'wrapPublicKey' | 'receiptPublicKey'
>;

/**
 * Returns the pinned Cubist escrow keys, or empty keys when the configuration
 * is missing or invalid. Empty keys are never used: recovery is disabled
 * whenever {@link isMfaRecoveryConfigured} is false.
 */
export function tryGetCubistKeys(): CubistKeys {
  try {
    const { wrapPublicKey, receiptPublicKey } = getCubistConfig();
    return { wrapPublicKey, receiptPublicKey };
  } catch {
    return {
      wrapPublicKey: new Uint8Array(),
      receiptPublicKey: new Uint8Array(),
    };
  }
}

/** Returns whether all values required for a live recovery request exist. */
export function isMfaRecoveryConfigured(): boolean {
  try {
    getCubistConfig();
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
