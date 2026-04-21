import {
  AuthenticatedUserStorageService,
  type AuthenticatedUserStorageMessenger,
  type Environment,
} from '@metamask/authenticated-user-storage';
import type { MessengerClientInitFunction } from '../types';
import Logger from '../../../util/Logger';

/**
 * Map the mobile app's `METAMASK_ENVIRONMENT` value onto the environments
 * supported by the authenticated-user-storage package (`dev` | `uat` | `prod`).
 *
 * - `production` / `beta` / `rc` → `prod`
 * - `rc` candidates still ship against prod storage.
 * - `exp` / `test` / `e2e` / `dev` / default → `dev`.
 *
 * `uat` is reserved for the extension's intermediate staging ring and is not
 * currently targeted from mobile.
 *
 * @returns The Environment value for the current build.
 */
export function getAuthenticatedUserStorageEnvironment(): Environment {
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return 'prod';
    case 'dev':
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return 'dev';
  }
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
