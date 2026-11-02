import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import type { MessengerClientInitFunction } from '../types';
import { ApiEnv, getApiEnv } from '../../apiEnv';

const PROFILE_API_URL_BY_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://profile.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://profile.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://profile.api.cx.metamask.io',
};

const getProfileApiBaseUrl = (): string =>
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
