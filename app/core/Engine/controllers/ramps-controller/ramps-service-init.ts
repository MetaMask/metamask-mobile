import { Platform } from 'react-native';
import { ControllerInitFunction } from '../../types';
import {
  RampsService,
  RampsServiceMessenger,
  RampsEnvironment,
} from '@metamask/ramps-controller';

/**
 * Returns the ramps environment to use for the RampsService.
 *
 * Build pipeline context:
 * - GitHub Actions (builds.yml): `RAMPS_ENVIRONMENT` is injected directly at build time
 * via `apply-build-config.js`, so we read it explicitly. This is the current CI/CD path
 * and the one we are standardising on going forward.
 * - Bitrise (.js.env): `RAMPS_ENVIRONMENT` is not set; environment is inferred from
 * `METAMASK_ENVIRONMENT` via the switch below. This path is being deprecated in favour
 * of the GitHub Actions pipeline and will be removed once the migration is complete.
 * - E2E tests: Even when running inside GitHub Actions, E2E builds set `E2E=true` so that
 * the `METAMASK_ENVIRONMENT` switch is used instead, giving tests full control over
 * which environment is targeted.
 *
 * Impact on getRampsEnvironment:
 * When `GITHUB_ACTIONS=true` and `E2E` is not set, the function short-circuits and returns
 * `RampsEnvironment.Production` or `RampsEnvironment.Staging` directly from
 * `RAMPS_ENVIRONMENT`, bypassing the `METAMASK_ENVIRONMENT` switch entirely. This ensures
 * the value set in builds.yml is always respected in CI without relying on the
 * `METAMASK_ENVIRONMENT` mapping, which was the source of environment mismatches on Bitrise.
 */
export function getRampsEnvironment(): RampsEnvironment {
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true') {
    const rampsEnv = process.env.RAMPS_ENVIRONMENT;
    return rampsEnv === 'production'
      ? RampsEnvironment.Production
      : RampsEnvironment.Staging;
  }
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return RampsEnvironment.Production;
    case 'dev':
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return RampsEnvironment.Staging;
  }
}

/**
 * Gets the context for the ramps service based on the platform.
 *
 * @returns The context string (e.g., 'mobile-ios', 'mobile-android').
 */
export function getRampsContext(): string {
  return Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android';
}

/**
 * Initialize the on-ramp service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const rampsServiceInit: ControllerInitFunction<
  RampsService,
  RampsServiceMessenger
> = ({ controllerMessenger }) => {
  const service = new RampsService({
    messenger: controllerMessenger,
    environment: getRampsEnvironment(),
    context: getRampsContext(),
    fetch,
  });

  return {
    controller: service,
  };
};
