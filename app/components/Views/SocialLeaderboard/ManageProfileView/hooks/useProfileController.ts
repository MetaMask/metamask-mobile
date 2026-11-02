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

/**
 * Bumped at the start of every profile edit. A `getProfile` that started
 * before the bump can still resolve afterwards and write the pre-edit
 * profile back through `fetchAndUpdateProfile`.
 */
let profileMutationVersion = 0;

/** Saves that have started and not yet finished. */
let profileMutationsInFlight = 0;

const profileMutationWaiters: (() => void)[] = [];

/** Test helper. Forgets edits that should outrank an in-flight profile read. */
export const resetProfileMutationVersion = (): void => {
  profileMutationVersion = 0;
  profileMutationsInFlight = 0;
  profileMutationWaiters.splice(0).forEach((resolve) => resolve());
};

/**
 * Cache key used by ProfileService.getProfile. Repeated here so a stale
 * in-flight read can be dropped without calling into the service's private
 * invalidation helper.
 */
const PROFILE_GET_QUERY_KEY = 'ProfileService:getProfile';

const beginProfileMutation = (): void => {
  profileMutationVersion += 1;
  profileMutationsInFlight += 1;
};

const endProfileMutation = (): void => {
  profileMutationsInFlight = Math.max(0, profileMutationsInFlight - 1);
  if (profileMutationsInFlight === 0) {
    profileMutationWaiters.splice(0).forEach((resolve) => resolve());
  }
};

/** Resolves once every profile save that has already started has finished. */
const waitForProfileMutations = (): Promise<void> => {
  if (profileMutationsInFlight === 0) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    profileMutationWaiters.push(() => {
      resolve();
    });
  });
};

/**
 * Applies a profile read unless an edit overlaps it.
 * A late read is discarded. The replacement read waits until that edit's
 * save has finished, then repeats this same check.
 */
const readProfileKeepingLaterEdits = async (
  profileId: string,
): Promise<Profile> => {
  const versionAtStart = profileMutationVersion;
  const fetched =
    await Engine.context.ProfileController.fetchAndUpdateProfile(profileId);
  if (
    versionAtStart === profileMutationVersion &&
    profileMutationsInFlight === 0
  ) {
    return fetched;
  }

  // The read started first, or while a save was still open. Its response can
  // be the pre-edit profile and can refill the cache. Wait for the save, drop
  // that cache, and read again. Reading immediately would race the save.
  await waitForProfileMutations();
  await Engine.context.ProfileService.invalidateQueries({
    queryKey: [PROFILE_GET_QUERY_KEY, profileId],
  });
  return readProfileKeepingLaterEdits(profileId);
};

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
      beginProfileMutation();
      try {
        await Engine.context.ProfileController.updateProfile(input);
      } finally {
        endProfileMutation();
      }
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
      await readProfileKeepingLaterEdits(profileId),
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
