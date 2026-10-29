import Engine from '../../../../core/Engine';

interface ProfileBlockOptions {
  profileId: string;
}

interface TraderBlockMessenger {
  call: (
    action: 'SocialService:block' | 'SocialService:unblockProfile',
    options: ProfileBlockOptions,
  ) => Promise<void>;
}

const getMessenger = (): TraderBlockMessenger =>
  Engine.controllerMessenger as unknown as TraderBlockMessenger;

/**
 * Blocks a trader for the current user.
 *
 * Call as a member expression so the messenger keeps its `this` binding.
 *
 * @param profileId - Clicker profile id (UUID) of the trader.
 */
export const blockTrader = (profileId: string): Promise<void> =>
  getMessenger().call('SocialService:block', { profileId });

/**
 * Removes the current user's block on a trader. A no-op when not blocked.
 *
 * @param profileId - Clicker profile id (UUID) of the trader.
 */
export const unblockTrader = (profileId: string): Promise<void> =>
  getMessenger().call('SocialService:unblockProfile', { profileId });
