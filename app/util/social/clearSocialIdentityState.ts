import {
  getDefaultSocialControllerState,
  type SocialController,
  type SocialControllerState,
} from '@metamask/social-controllers';
import type { ProfileController } from '@metamask/profile-controller';
import {
  SOCIAL_LAST_TRADE_AT,
  SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
  SOCIAL_LEADERBOARD_SNAPSHOT_PREFIX,
  SOCIAL_POST_TRADE_PROMPTS,
  SOCIAL_TAB_VISITED,
} from '../../constants/storage';
import { clearLocalSocialProfile } from '../../components/Views/SocialLeaderboard/MyProfileView/hooks/localSocialProfileStore';
import { resetSocialTermsAcceptance } from '../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../Logger';
import { ensureError } from '../errorUtils';

/**
 * Controllers whose persisted state is the signed-in social identity.
 *
 * `ProfileController.profile` is what the UI renders as the social username.
 * `SocialController` caches that person's leaderboard and follow list.
 */
export interface SocialIdentityControllers {
  ProfileController: Pick<ProfileController, 'clearState'>;
  SocialController: SocialController;
}

/**
 * `SocialController` does not expose `clearState`. `update` is protected on
 * `BaseController` and is the same replacement hook `ProfileController.clearState`
 * uses.
 */
interface SocialStateWriter {
  update: (recipe: () => SocialControllerState) => void;
}

const PERSISTED_SOCIAL_IDENTITY_KEYS = [
  SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
  SOCIAL_TAB_VISITED,
  SOCIAL_LAST_TRADE_AT,
  SOCIAL_POST_TRADE_PROMPTS,
] as const;

const replaceSocialControllerState = (controller: SocialController): void => {
  (controller as unknown as SocialStateWriter).update(() =>
    getDefaultSocialControllerState(),
  );
};

const removeStorageKey = async (key: string): Promise<void> => {
  try {
    await StorageWrapper.removeItem(key);
  } catch (error) {
    Logger.error(
      ensureError(error),
      `Failed to remove persisted social key ${key}`,
    );
  }
};

/**
 * Removes MMKV entries that belong to the previous social identity.
 *
 * Terms acceptance is included: it is consent by a specific person, and the
 * terms module also keeps an in-process flag that survives deleting the key.
 * Onboarding-shown, tab-visited, last-trade, post-trade prompts, and
 * leaderboard snapshots are the previous person's activity or cached social
 * UI, so the next wallet must not inherit them.
 */
const clearPersistedSocialStorage = async (): Promise<void> => {
  try {
    await resetSocialTermsAcceptance();
  } catch (error) {
    Logger.error(
      ensureError(error),
      'Failed to reset persisted social terms acceptance',
    );
  }

  await Promise.all(
    PERSISTED_SOCIAL_IDENTITY_KEYS.map((key) => removeStorageKey(key)),
  );

  try {
    const allKeys = await StorageWrapper.getAllKeys();
    const snapshotKeys = (allKeys ?? []).filter(
      (key): key is string =>
        typeof key === 'string' &&
        key.startsWith(SOCIAL_LEADERBOARD_SNAPSHOT_PREFIX),
    );
    await Promise.all(snapshotKeys.map((key) => removeStorageKey(key)));
  } catch (error) {
    Logger.error(
      ensureError(error),
      'Failed to list persisted social leaderboard snapshots',
    );
  }
};

/**
 * Drops the previous person's social profile from controller state, the
 * in-memory profile overlay, and MMKV.
 *
 * Called from wallet reset (`Authentication.resetWalletState`), not from
 * `Engine.resetState`. Password change recreates the vault through
 * `Engine.resetState` for the same SRP and must keep the cached profile.
 *
 * Failures are logged and swallowed so a storage error cannot abort reset.
 *
 * @param controllers - Profile and social controllers for the current engine.
 */
export const clearSocialIdentityState = async (
  controllers: SocialIdentityControllers,
): Promise<void> => {
  try {
    controllers.ProfileController.clearState();
  } catch (error) {
    Logger.error(
      ensureError(error),
      'Failed to clear ProfileController during wallet reset',
    );
  }

  try {
    replaceSocialControllerState(controllers.SocialController);
  } catch (error) {
    Logger.error(
      ensureError(error),
      'Failed to clear SocialController during wallet reset',
    );
  }

  try {
    clearLocalSocialProfile();
  } catch (error) {
    Logger.error(
      ensureError(error),
      'Failed to clear the in-memory social profile during wallet reset',
    );
  }

  await clearPersistedSocialStorage();
};
