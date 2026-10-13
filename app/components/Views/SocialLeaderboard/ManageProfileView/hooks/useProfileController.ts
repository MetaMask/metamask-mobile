import type {
  Profile,
  UpdateProfileParams,
  UsernameAvailabilityResponse,
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
  checkUsernameAvailability: (
    username: string,
  ) => Promise<UsernameAvailabilityResponse>;
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

  const checkUsernameAvailability = useCallback(
    async (username: string): Promise<UsernameAvailabilityResponse> =>
      await Engine.context.ProfileController.checkUsernameAvailability(
        username,
      ),
    [],
  );

  return {
    isControllerBacked: Boolean(profile),
    profile,
    linkedAddresses: state?.profile.linkedAddresses ?? [],
    updateProfile,
    checkUsernameAvailability,
  };
};
