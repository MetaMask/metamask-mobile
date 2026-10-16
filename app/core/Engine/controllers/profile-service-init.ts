import {
  buildMockProfileService,
  MOCK_PROFILE_API_RESPONSE,
  ProfileService,
  type CreateProfileParams,
  type ProfileApiResponse,
  type ProfileServiceMessenger,
  type ReplaceProfileParams,
  type UpdateProfileParams,
} from '@metamask/profile-controller';
import AppConstants from '../../AppConstants';
import type { MessengerClientInitFunction } from '../types';

/**
 * The profile API is not live for social onboarding yet.
 * Set this to false to construct `ProfileService` against `PROFILE_API_URL`.
 * Call sites keep using `ProfileController` either way.
 */
export const USE_MOCK_PROFILE_SERVICE = true;

const nowIso = (): string => new Date().toISOString();

const profileFromCreateParams = (
  params: CreateProfileParams,
): ProfileApiResponse => {
  const timestamp = nowIso();
  return {
    profile_id: params.profile_id,
    username: params.username,
    display_name: params.display_name,
    bio: params.bio ?? null,
    linked_addresses: params.linked_addresses,
    avatar_url: params.avatar_url ?? '',
    trading_privacy: params.trading_privacy,
    connected_to_x: false,
    created_at: timestamp,
    updated_at: timestamp,
  };
};

/**
 * Registers `buildMockProfileService` handlers that keep the submitted profile.
 * Username checks and X auth stay on the package fixtures.
 */
const registerEchoingMockProfileService = (
  messenger: ProfileServiceMessenger,
): void => {
  let profile: ProfileApiResponse | undefined;

  buildMockProfileService(messenger, {
    getProfile: async (profileId) => {
      if (profile?.profile_id === profileId) {
        return profile;
      }
      return { ...MOCK_PROFILE_API_RESPONSE, profile_id: profileId };
    },
    createProfile: async (params) => {
      profile = profileFromCreateParams(params);
      return profile;
    },
    replaceProfile: async (profileId, params: ReplaceProfileParams) => {
      const timestamp = nowIso();
      profile = {
        profile_id: profileId,
        username: params.username,
        display_name: params.display_name,
        bio: params.bio ?? null,
        linked_addresses: params.linked_addresses,
        avatar_url: params.avatar_url ?? profile?.avatar_url ?? '',
        trading_privacy: params.trading_privacy,
        connected_to_x: profile?.connected_to_x ?? false,
        created_at: profile?.created_at ?? timestamp,
        updated_at: timestamp,
      };
      return profile;
    },
    updateProfile: async (profileId, params: UpdateProfileParams) => {
      const base =
        profile?.profile_id === profileId ? profile : MOCK_PROFILE_API_RESPONSE;
      profile = {
        ...base,
        profile_id: profileId,
        username: params.username ?? base.username,
        display_name: params.display_name ?? base.display_name,
        bio: params.bio === undefined ? base.bio : params.bio,
        linked_addresses: params.linked_addresses ?? base.linked_addresses,
        avatar_url: params.avatar_url ?? base.avatar_url,
        trading_privacy: params.trading_privacy ?? base.trading_privacy,
        updated_at: nowIso(),
      };
      return profile;
    },
    deleteProfile: async () => {
      profile = undefined;
    },
  });
};

export const createProfileServiceClient = (
  messenger: ProfileServiceMessenger,
  useMock: boolean = USE_MOCK_PROFILE_SERVICE,
): ProfileService => {
  if (useMock) {
    registerEchoingMockProfileService(messenger);
    // ProfileController calls ProfileService actions. Engine only stores this.
    return { name: 'ProfileService' } as ProfileService;
  }

  return new ProfileService({
    messenger,
    baseUrl: AppConstants.PROFILE_API_URL,
  });
};

export const profileServiceInit: MessengerClientInitFunction<
  ProfileService,
  ProfileServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: createProfileServiceClient(controllerMessenger),
});
