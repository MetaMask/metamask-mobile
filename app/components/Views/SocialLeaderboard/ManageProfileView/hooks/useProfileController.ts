import type {
  ConnectXSession,
  CreateProfileParams,
  Profile,
  UpdateProfileParams,
  UsernameAvailabilityResponse,
  XProfile,
} from '@metamask/profile-controller';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import {
  selectProfileControllerProfile,
  selectProfileControllerState,
} from '../../../../../selectors/profileController';

export interface UseProfileControllerResult {
  isControllerBacked: boolean;
  profile: Profile | undefined;
  linkedAddresses: string[];
  updateProfile: (input: UpdateProfileParams) => Promise<void>;
  createProfile: (input: CreateProfileParams) => Promise<Profile>;
  fetchAndUpdateProfile: (profileId: string) => Promise<Profile>;
  fetchAndUpdateXAccount: () => Promise<XProfile>;
  disconnectX: (profileId: string) => Promise<void>;
  checkUsernameAvailability: (
    username: string,
  ) => Promise<UsernameAvailabilityResponse>;
  getXAuthorizationUrl: () => Promise<ConnectXSession>;
}

export const useProfileController = (): UseProfileControllerResult => {
  const profile = useSelector(selectProfileControllerProfile);
  const state = useSelector(selectProfileControllerState);

  const updateProfile = useCallback(
    async (input: UpdateProfileParams): Promise<void> => {
      await Engine.context.ProfileController.updateProfile(input);
    },
    [],
  );

  const createProfile = useCallback(
    async (input: CreateProfileParams): Promise<Profile> =>
      await Engine.context.ProfileController.createProfile(input),
    [],
  );

  const checkUsernameAvailability = useCallback(
    async (username: string): Promise<UsernameAvailabilityResponse> =>
      await Engine.context.ProfileController.checkUsernameAvailability(
        username,
      ),
    [],
  );

  const getXAuthorizationUrl = useCallback(
    async (): Promise<ConnectXSession> =>
      await Engine.context.ProfileController.getXAuthorizationUrl(),
    [],
  );

  const fetchAndUpdateProfile = useCallback(
    async (profileId: string): Promise<Profile> =>
      await Engine.context.ProfileController.fetchAndUpdateProfile(profileId),
    [],
  );

  const fetchAndUpdateXAccount = useCallback(
    async (): Promise<XProfile> =>
      await Engine.context.ProfileController.fetchAndUpdateXAccount(),
    [],
  );

  const disconnectX = useCallback(async (profileId: string): Promise<void> => {
    await Engine.context.ProfileController.disconnectX(profileId);
  }, []);

  return {
    isControllerBacked: Boolean(profile),
    profile,
    linkedAddresses: state?.profile.linkedAddresses ?? [],
    updateProfile,
    createProfile,
    fetchAndUpdateProfile,
    fetchAndUpdateXAccount,
    disconnectX,
    checkUsernameAvailability,
    getXAuthorizationUrl,
  };
};
