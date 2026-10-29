import {
  ProfileService,
  type ProfileApiResponse,
  type ProfileServiceMessenger,
  type ReplaceProfileParams,
  type UpdateProfileParams,
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

/**
 * `getProfile` responses stay fresh for a minute, so a refetch right after
 * an edit would otherwise put the pre-edit profile back into controller state.
 */
export class ProfileServiceWithFreshReads extends ProfileService {
  override async updateProfile(
    profileId: string,
    params: UpdateProfileParams,
  ): Promise<ProfileApiResponse> {
    const response = await super.updateProfile(profileId, params);
    await this.#invalidateProfile(profileId);
    return response;
  }

  override async replaceProfile(
    profileId: string,
    params: ReplaceProfileParams,
  ): Promise<ProfileApiResponse> {
    const response = await super.replaceProfile(profileId, params);
    await this.#invalidateProfile(profileId);
    return response;
  }

  async #invalidateProfile(profileId: string): Promise<void> {
    await this.invalidateQueries({
      queryKey: [`${this.name}:getProfile`, profileId],
    });
  }
}

export const profileServiceInit: MessengerClientInitFunction<
  ProfileService,
  ProfileServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new ProfileServiceWithFreshReads({
    messenger: controllerMessenger,
    baseUrl: getProfileApiBaseUrl(),
  }),
});
