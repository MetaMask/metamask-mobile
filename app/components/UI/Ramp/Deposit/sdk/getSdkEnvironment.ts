import { SdkEnvironment } from '@consensys/native-ramps-sdk';

/**
 * Returns the Deposit (native-ramps-sdk) environment for the current build.
 *
 * Build pipeline context:
 * - GitHub Actions (builds.yml): `RAMPS_ENVIRONMENT` is injected at build time via
 * `apply-build-config.js`, so we read it directly. This is the current CI/CD path
 * and the one we are standardising on going forward.
 * - Bitrise (.js.env): `RAMPS_ENVIRONMENT` is not available; environment is inferred from
 * `METAMASK_ENVIRONMENT` via the switch below. This path is being deprecated in favour
 * of the GitHub Actions pipeline and will be removed once the migration is complete.
 * - E2E tests: Even when running inside GitHub Actions, E2E builds set `E2E=true` so that
 * the `METAMASK_ENVIRONMENT` switch is used instead, giving tests full control over
 * which environment is targeted.
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
