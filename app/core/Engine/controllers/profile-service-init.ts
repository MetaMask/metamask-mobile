import {
  ProfileService,
  ProfileServiceMessenger,
} from '@metamask/profile-controller';
import { MessengerClientInitFunction } from '../types';
import { ApiEnv, getApiEnv } from '../../apiEnv';

const PROFILE_API_URL_BY_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://profile-api.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://profile-api.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://profile-api.api.cx.metamask.io',
};

/**
 * Initialize the profile service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const profileServiceInit: MessengerClientInitFunction<
  ProfileService,
  ProfileServiceMessenger
> = ({ controllerMessenger }) => {
  const baseUrl =
    process.env.PROFILE_API_URL ?? PROFILE_API_URL_BY_ENV[getApiEnv()];

  const controller = new ProfileService({
    messenger: controllerMessenger,
    baseUrl,
  });

  return {
    controller,
  };
};
