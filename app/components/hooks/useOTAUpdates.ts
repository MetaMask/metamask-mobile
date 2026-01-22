import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { checkForUpdateAsync, fetchUpdateAsync } from 'expo-updates';
import { InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Logger from '../../util/Logger';
import { createOTAUpdatesModalNavDetails } from '../UI/OTAUpdatesModal/OTAUpdatesModal';
import { selectOtaUpdatesEnabledFlag } from '../../selectors/featureFlagController/otaUpdates';
/**
 * Hook to manage OTA updates based on a feature flag.
 *
 * Behavior:
 * - Runs once when the app initially opens.
 * - If the `otaUpdatesEnabled` flag is on and the app is not in development, checks for an OTA update via `checkForUpdateAsync`.
 * - When a new OTA update is downloaded (`fetchUpdateAsync().isNew === true`), navigates to the `OTAUpdatesModal` bottom sheet after interactions complete.
 * - If no update is available or the fetched update is not new, logs and continues with the current version without blocking startup.
 *
 * This hook does not reload the app itself; the `OTAUpdatesModal` is responsible for
 * calling `reloadAsync` when the user confirms.
 */
export const useOTAUpdates = () => {
  const otaUpdatesEnabled = useSelector(selectOtaUpdatesEnabledFlag);
  const navigation = useNavigation();

  useEffect(() => {
    const checkForUpdates = async () => {
      if (!otaUpdatesEnabled || __DEV__) {
        return;
      }

      try {
        const update = await checkForUpdateAsync();

        if (update.isAvailable) {
          const fetchResult = await fetchUpdateAsync();

          if (fetchResult.isNew) {
            InteractionManager.runAfterInteractions(() => {
              navigation.navigate(...createOTAUpdatesModalNavDetails());
            });
          } else {
            Logger.log('OTA Updates: Update fetched but not new');
          }
        } else {
          Logger.log('OTA Updates: No updates available');
        }
      } catch (error) {
        Logger.error(
          error as Error,
          'OTA Updates: Error checking for updates, continuing with current version',
        );
      }
    };

    checkForUpdates();
  }, [navigation, otaUpdatesEnabled]);
};
