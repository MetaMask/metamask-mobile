import {
  AuthenticatedUserStorageService,
  type AuthenticatedUserStorageMessenger,
  type Environment,
} from '@metamask/authenticated-user-storage';
import type { MessengerClientInitFunction } from '../types';
import Logger from '../../../util/Logger';
import { ApiEnv, getApiEnv } from '../../apiEnv';

const USER_STORAGE_ENVIRONMENT_BY_API_ENV: Record<ApiEnv, Environment> = {
  [ApiEnv.Dev]: 'dev',
  [ApiEnv.Uat]: 'uat',
  [ApiEnv.Prod]: 'prod',
};

/**
 * The environment MUST match the one used by `AuthenticationController`: a
 * PRD-issued JWT cannot be validated against dev user-storage APIs and
 * vice versa. Both read from the same `getApiEnv` source so they always agree.
 */
export function getAuthenticatedUserStorageEnvironment(): Environment {
  return USER_STORAGE_ENVIRONMENT_BY_API_ENV[getApiEnv()];
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
