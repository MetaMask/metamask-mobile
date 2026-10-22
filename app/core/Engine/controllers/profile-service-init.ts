import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import type { MessengerClientInitFunction } from '../types';
import { ApiEnv, getApiEnv } from '../../apiEnv';

const PROFILE_API_URL_BY_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://profile-api.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://profile-api.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://profile-api.api.cx.metamask.io',
};

export const getProfileApiBaseUrl = (): string =>
  process.env.PROFILE_API_URL ?? PROFILE_API_URL_BY_ENV[getApiEnv()];

export const profileServiceInit: MessengerClientInitFunction<
  ProfileService,
  ProfileServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new ProfileService({
    messenger: controllerMessenger,
    baseUrl: getProfileApiBaseUrl(),
  }),
});
