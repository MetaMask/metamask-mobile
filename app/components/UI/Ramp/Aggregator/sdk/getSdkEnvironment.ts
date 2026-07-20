import { Environment } from '@consensys/on-ramp-sdk';

/**
 * When RAMPS_ENVIRONMENT is set (set by builds.yml), uses it directly.
 * Otherwise (e.g. Jest, environments without builds.yml), uses METAMASK_ENVIRONMENT switch.
 */
export function getSdkEnvironment() {
  if (process.env.RAMPS_ENVIRONMENT) {
    return process.env.RAMPS_ENVIRONMENT === 'production'
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
