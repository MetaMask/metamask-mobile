import type { CreateServicePolicyOptions } from '@metamask/base-data-service';
import {
  SocialService,
  type SocialServiceMessenger,
} from '@metamask/social-controllers';
import type { MessengerClientInitFunction } from '../types';
import AppConstants from '../../AppConstants';
import Logger from '../../../util/Logger';

/**
 * Social reads share one circuit breaker. The package default leaves it open
 * for 30 minutes, so a burst of slow-network timeouts makes Try again fail
 * with no new request until the app restarts (TSA-1552).
 *
 * These reads are user-triggered, so the breaker stays closed and each read
 * retries once. Try again always sends a new request.
 */
export const SOCIAL_SERVICE_POLICY_OPTIONS = {
  maxRetries: 1,
  maxConsecutiveFailures: Number.MAX_SAFE_INTEGER,
} as const satisfies Pick<
  CreateServicePolicyOptions,
  'maxRetries' | 'maxConsecutiveFailures'
>;

/**
 * Initialize the SocialService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized SocialService.
 */
export const socialServiceInit: MessengerClientInitFunction<
  SocialService,
  SocialServiceMessenger
> = ({ controllerMessenger }) => {
  try {
    const controller = new SocialService({
      messenger: controllerMessenger,
      baseUrl: AppConstants.SOCIAL_API_URL,
      policyOptions: SOCIAL_SERVICE_POLICY_OPTIONS,
    });

    return { controller };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize SocialService');
    throw error;
  }
};
