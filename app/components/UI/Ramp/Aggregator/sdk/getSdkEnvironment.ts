import { Environment } from '@consensys/on-ramp-sdk';

/**
 * When BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY (and not E2E), uses RAMPS_ENVIRONMENT (set by builds.yml).
 * When not (Bitrise / .js.env / E2E), uses METAMASK_ENVIRONMENT switch.
 */
export function getSdkEnvironment() {
  if (process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY === 'true') {
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
