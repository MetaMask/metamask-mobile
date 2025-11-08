import { isEnabled, isEmbeddedLaunch, checkForUpdateAsync, fetchUpdateAsync, reloadAsync } from 'expo-updates';
import Logger from '../Logger';

/**
 * Checks for OTA updates and applies them if available
 * This runs on app start to ensure users get the latest updates
 * @param isFeatureFlagEnabled - Whether the OTA updates feature flag is enabled
 */
export const checkForUpdates = async (
  isFeatureFlagEnabled: boolean,
): Promise<void> => {
  try {
    // Only check for updates if:
    // 1. Updates are enabled
    // 2. Not running embedded launch (development mode)
    // 3. Not in __DEV__ mode
    if (!isEnabled || isEmbeddedLaunch || __DEV__) {
      Logger.log(
        'Updates: Skipping update check (disabled, embedded, or dev mode)',
      );
      return;
    }

    // Check if the feature flag is enabled
    if (!isFeatureFlagEnabled) {
      Logger.log('Updates: Skipping update check (feature flag disabled)');
      return;
    }

    Logger.log('Updates: Checking for updates...');

    // Check if an update is available
    const update = await checkForUpdateAsync();

    if (update.isAvailable) {
      Logger.log('Updates: Update available, fetching...');

      // Fetch and download the update
      await fetchUpdateAsync();

      Logger.log('Updates: Update downloaded successfully, reloading app...');

      // Reload the app to apply the update
      await reloadAsync();
    } else {
      Logger.log('Updates: No updates available');
    }
  } catch (error) {
    // Don't crash the app if update check fails
    Logger.error(error as Error, 'Updates: Error checking for updates');
  }
};
