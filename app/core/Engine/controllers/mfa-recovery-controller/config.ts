import type { Environment, Scope } from '@cubist-labs/cubesigner-sdk';
import { DEFAULT_REGISTRATION_URL, DEFAULT_SESSION_SCOPES } from './constants';
import { MfaRecoveryControllerError } from './errors';

export interface CubistConfig {
  environment: Environment;
  orgId: string;
  wrapPublicKey: string;
  receiptPublicKey: string;
  scopes: Scope[];
  registrationUrl: string;
  mpcApiKey: string;
}

type EnvironmentVariableName =
  | 'MM_CUBIST_ENV'
  | 'MM_CUBIST_ORG_ID'
  | 'MM_CUBIST_WRAP_PUBLIC_KEY'
  | 'MM_CUBIST_RECEIPT_PUBLIC_KEY'
  | 'MM_CUBIST_SESSION_SCOPES'
  | 'MM_RECOVERY_REGISTRATION_URL'
  | 'MFA_RECOVERY_DEV_API_KEY';

/** Returns the Cubist configuration used by the recovery service. */
export function getCubistConfig(): CubistConfig {
  const environment = readEnvironmentVariable('MM_CUBIST_ENV') ?? 'gamma';
  if (!isEnvironment(environment)) {
    throw new MfaRecoveryControllerError(
      'MM_CUBIST_ENV must be beta, gamma, or prod',
      'invalid_configuration',
    );
  }

  const config: CubistConfig = {
    environment,
    orgId: getRequiredConfig('MM_CUBIST_ORG_ID'),
    wrapPublicKey: getRequiredConfig('MM_CUBIST_WRAP_PUBLIC_KEY'),
    receiptPublicKey: getRequiredConfig('MM_CUBIST_RECEIPT_PUBLIC_KEY'),
    scopes: parseScopes(readEnvironmentVariable('MM_CUBIST_SESSION_SCOPES')),
    registrationUrl:
      readEnvironmentVariable('MM_RECOVERY_REGISTRATION_URL') ??
      DEFAULT_REGISTRATION_URL,
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
    case 'MM_CUBIST_ENV':
      return process.env.MM_CUBIST_ENV;
    case 'MM_CUBIST_ORG_ID':
      return process.env.MM_CUBIST_ORG_ID;
    case 'MM_CUBIST_WRAP_PUBLIC_KEY':
      return process.env.MM_CUBIST_WRAP_PUBLIC_KEY;
    case 'MM_CUBIST_RECEIPT_PUBLIC_KEY':
      return process.env.MM_CUBIST_RECEIPT_PUBLIC_KEY;
    case 'MM_CUBIST_SESSION_SCOPES':
      return process.env.MM_CUBIST_SESSION_SCOPES;
    case 'MM_RECOVERY_REGISTRATION_URL':
      return process.env.MM_RECOVERY_REGISTRATION_URL;
    case 'MFA_RECOVERY_DEV_API_KEY':
      return process.env.MFA_RECOVERY_DEV_API_KEY;
    default:
      return undefined;
  }
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

function parseScopes(value: string | undefined): Scope[] {
  if (value === undefined) {
    return [...DEFAULT_SESSION_SCOPES];
  }

  const scopes = value
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
  if (scopes.length === 0) {
    throw new MfaRecoveryControllerError(
      'MM_CUBIST_SESSION_SCOPES must not be empty',
      'invalid_configuration',
    );
  }
  return scopes;
}

function isEnvironment(value: string): value is Environment {
  return value === 'beta' || value === 'gamma' || value === 'prod';
}
