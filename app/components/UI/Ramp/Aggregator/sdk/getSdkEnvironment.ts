import { Environment } from '@consensys/on-ramp-sdk';

/**
 * TEMPORARY: When GITHUB_ACTIONS, uses RAMPS_ENVIRONMENT (set by builds.yml).
 * When not (Bitrise / .js.env), uses METAMASK_ENVIRONMENT switch. Remove condition once Bitrise is deprecated.
 */
export function getSdkEnvironment() {
  if (process.env.GITHUB_ACTIONS === 'true') {
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
