import type { Environment, Scope } from '@cubist-labs/cubesigner-sdk';
import { DEFAULT_REGISTRATION_URL } from './constants';
import { MfaRecoveryControllerError } from './errors';
import { getMfaConfig } from './mfa-config';

export interface CubistConfig {
  environment: Environment;
  orgId: string;
  wrapPublicKey: string;
  receiptPublicKey: string;
  scopes: Scope[];
  registrationUrl: string;
  mpcApiKey: string;
}

type EnvironmentVariableName = 'MFA_RECOVERY_DEV_API_KEY';

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
    wrapPublicKey: getRequiredMfaConfig(
      mfaConfig.wrapPublicKey,
      'MFA_CONFIG.wrapPublicKey',
    ),
    receiptPublicKey: getRequiredMfaConfig(
      mfaConfig.receiptPublicKey,
      'MFA_CONFIG.receiptPublicKey',
    ),
    scopes: parseScopes(mfaConfig.sessionScopes),
    registrationUrl: mfaConfig.registrationUrl || DEFAULT_REGISTRATION_URL,
    mpcApiKey: getRequiredConfig('MFA_RECOVERY_DEV_API_KEY'),
  };

  return config;
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

/**
 * Reads an environment variable.
 *
 * The computed lookup keeps unit tests and the standalone Node runner
 * runtime-configurable. The static fallback is retained for React Native
 * builds, where Babel inlines the values supplied by the build environment.
 */
export function readEnvironmentVariable(
  name: EnvironmentVariableName,
): string | undefined {
  const runtimeValue = process.env[name];
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined
  ) {
    return runtimeValue;
  }
  if (runtimeValue !== undefined) {
    return runtimeValue;
  }

  switch (name) {
    case 'MFA_RECOVERY_DEV_API_KEY':
      return process.env.MFA_RECOVERY_DEV_API_KEY;
    default:
      return undefined;
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

function getRequiredConfig(name: EnvironmentVariableName): string {
  const value = readEnvironmentVariable(name)?.trim();
  if (!value) {
    throw new MfaRecoveryControllerError(
      `${name} is not configured`,
      'missing_configuration',
    );
  }
  return value;
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
