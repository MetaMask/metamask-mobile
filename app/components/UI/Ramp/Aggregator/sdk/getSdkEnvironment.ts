import { Environment } from '@consensys/on-ramp-sdk';

/**
 * When not Bitrise and not E2E (GitHub Actions / local), uses RAMPS_ENVIRONMENT (set by builds.yml).
 * When Bitrise or E2E, uses METAMASK_ENVIRONMENT switch.
 */
export function getSdkEnvironment() {
  if (process.env.BITRISE !== 'true' && process.env.E2E !== 'true') {
    const rampsEnv = process.env.RAMPS_ENVIRONMENT;
    return rampsEnv === 'production'
      ? Environment.Production
      : Environment.Staging;
  }
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return Environment.Production;
    case 'dev':
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return Environment.Staging;
  }
}
