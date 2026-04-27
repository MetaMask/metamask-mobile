import {
  AuthenticatedUserStorageService,
  type AuthenticatedUserStorageMessenger,
  type Environment,
} from '@metamask/authenticated-user-storage';
import type { MessengerClientInitFunction } from '../types';
import Logger from '../../../util/Logger';

/**
 * Returns the environment to use for the authenticated-user-storage service.
 *
 * The environment MUST match the one used by `AuthenticationController`, which
 * on mobile is always `Env.PRD` (see `authentication-controller-init.ts` — no
 * `config.env` override is passed, so it falls back to the controller's
 * default of `Env.PRD`). Mobile (and extension) only ever mint PRD bearer
 * tokens from the OIDC token endpoint.
 *
 * Pointing user-storage at `dev` / `uat` on a non-production build would cause
 * every request to 403 with "invalid access token" because a PRD-issued token
 * cannot be validated by the dev/uat user-storage APIs. This mirrors the fix
 * already applied in `profile-metrics-service-init.ts`, which also hardcodes
 * `Env.PRD` for the same reason.
 *
 * @returns Always `'prod'`.
 */
export function getAuthenticatedUserStorageEnvironment(): Environment {
  return 'prod';
}

/**
 * Initialize the AuthenticatedUserStorageService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized AuthenticatedUserStorageService.
 */
export const authenticatedUserStorageServiceInit: MessengerClientInitFunction<
  AuthenticatedUserStorageService,
  AuthenticatedUserStorageMessenger
> = ({ controllerMessenger }) => {
  try {
    const controller = new AuthenticatedUserStorageService({
      messenger: controllerMessenger,
      environment: getAuthenticatedUserStorageEnvironment(),
    });

    return { controller };
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize AuthenticatedUserStorageService',
    );
    throw error;
  }
};
