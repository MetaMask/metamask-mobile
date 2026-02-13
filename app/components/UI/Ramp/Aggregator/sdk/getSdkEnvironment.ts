import { Environment } from '@consensys/on-ramp-sdk';

/**
 * TEMPORARY: When GITHUB_ACTIONS (and not E2E), uses RAMPS_ENVIRONMENT (set by builds.yml).
 * E2E builds run in GitHub but use workflow env (METAMASK_ENVIRONMENT); use switch path there.
 * When not (Bitrise / .js.env / E2E), uses METAMASK_ENVIRONMENT switch. Remove once Bitrise is deprecated.
 */
export function getSdkEnvironment() {
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true') {
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
