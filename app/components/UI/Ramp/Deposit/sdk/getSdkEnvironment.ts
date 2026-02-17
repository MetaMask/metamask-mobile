import { SdkEnvironment } from '@consensys/native-ramps-sdk';

/**
 * When GITHUB_ACTIONS (and not E2E), uses RAMPS_ENVIRONMENT (set by builds.yml).
 * When not (Bitrise / .js.env / E2E), uses METAMASK_ENVIRONMENT switch.
 */
export function getSdkEnvironment() {
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true') {
    const rampsEnv = process.env.RAMPS_ENVIRONMENT;
    return rampsEnv === 'production'
      ? SdkEnvironment.Production
      : SdkEnvironment.Staging;
  }
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return SdkEnvironment.Production;
    case 'dev':
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return SdkEnvironment.Staging;
  }
}
