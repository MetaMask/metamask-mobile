import { useEffect, useState } from 'react';
import {
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
} from 'expo-updates';
import Logger from '../../util/Logger';
import { useFeatureFlag, FeatureFlagNames } from './useFeatureFlag';

/**
 * Hook to manage OTA updates based on feature flag
 * Checks for updates once when app initially opens if feature flag is enabled
 * Automatically reloads the app if an update is available
 * Returns isCheckingUpdates to gate rendering until check is complete
 */
export const useOTAUpdates = () => {
  const otaUpdatesEnabled = useFeatureFlag(FeatureFlagNames.otaUpdatesEnabled);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(true);

  useEffect(() => {
    const checkForUpdates = async () => {
      if (!otaUpdatesEnabled) {
        setIsCheckingUpdates(false);
        return;
      }

      if (__DEV__) {
        setIsCheckingUpdates(false);
        return;
      }

      try {
        const update = await checkForUpdateAsync();

        if (update.isAvailable) {
          const fetchResult = await fetchUpdateAsync();

          if (fetchResult.isNew) {
            await reloadAsync();
          } else {
            Logger.log('OTA Updates: Update fetched but not new');
            setIsCheckingUpdates(false);
          }
        } else {
          Logger.log('OTA Updates: No updates available');
          setIsCheckingUpdates(false);
        }
      } catch (error) {
        Logger.error(
          error as Error,
          'OTA Updates: Error checking for updates, continuing with current version',
        );
        setIsCheckingUpdates(false);
      }
    };

    checkForUpdates();
  }, [otaUpdatesEnabled]);

  return {
    isCheckingUpdates,
  };
};
