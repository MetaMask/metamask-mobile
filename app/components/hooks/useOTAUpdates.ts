import { useEffect, useState, useCallback } from 'react';
import {
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
} from 'expo-updates';
import { useSelector } from 'react-redux';
import { selectOTAUpdatesEnabled } from '../../selectors/featureFlagController/otaUpdatesEnabled';
import Logger from '../../util/Logger';

/**
 * Hook to manage OTA updates based on feature flag
 * Checks for updates once when app initially opens if feature flag is enabled
 * Returns state for showing update available modal to user
 */
export const useOTAUpdates = () => {
  const otaUpdatesEnabled = useSelector(selectOTAUpdatesEnabled);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      // if (!otaUpdatesEnabled) {
      //   Logger.log('OTA Updates: Feature flag disabled, skipping update check');
      //   return;
      // }

      // if (__DEV__) {
      //   Logger.log('OTA Updates: Skipping in development mode');
      //   return;
      // }

      try {
        const update = await checkForUpdateAsync();

        if (update.isAvailable) {
          const fetchResult = await fetchUpdateAsync();
          if (fetchResult.isNew) {
            Logger.log('OTA Updates: New update downloaded, showing modal');
            setUpdateAvailable(true);
          } else {
            Logger.log('OTA Updates: Update fetched but not new');
          }
        } else {
          Logger.log('OTA Updates: No updates available');
        }
      } catch (error) {
        Logger.error(
          error as Error,
          'useOTAUpdates: Error checking for updates',
        );
      }
    };

    // Check on initial mount only
    checkForUpdates().catch((error) => {
      Logger.error(error, 'OTA Updates: Error on initial check');
    });
  }, [otaUpdatesEnabled]);

  const applyUpdate = useCallback(async () => {
    try {
      Logger.log('OTA Updates: Applying update and reloading app');
      await reloadAsync();
    } catch (error) {
      Logger.error(error as Error, 'useOTAUpdates: Error applying update');
      // Fallback: just dismiss the modal if reload fails
      setUpdateAvailable(false);
    }
  }, []);

  return {
    updateAvailable,
    applyUpdate,
  };
};
