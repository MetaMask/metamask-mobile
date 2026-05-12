import {
  AuthenticatedUserStorageService,
  type AuthenticatedUserStorageMessenger,
  type Environment,
} from '@metamask/authenticated-user-storage';
import type { MessengerClientInitFunction } from '../types';
import Logger from '../../../util/Logger';
import { devApiEnv } from '../../devApiEnv';

/**
 * The environment MUST match the one used by `AuthenticationController`: a
 * PRD-issued JWT cannot be validated against dev user-storage APIs and
 * vice versa. Both read from the same `devApiEnv` source so they always agree.
 */
export function getAuthenticatedUserStorageEnvironment(): Environment {
  return devApiEnv();
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
