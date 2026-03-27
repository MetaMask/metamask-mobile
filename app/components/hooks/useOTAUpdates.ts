import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { checkForUpdateAsync, fetchUpdateAsync } from 'expo-updates';
import { InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Logger from '../../util/Logger';
import { createOTAUpdatesModalNavDetails } from '../UI/OTAUpdatesModal/OTAUpdatesModal';
import { selectOtaUpdatesEnabledFlag } from '../../selectors/featureFlagController/otaUpdates';
import { selectCompletedOnboarding } from '../../selectors/onboarding';
/**
 * Hook to manage OTA updates based on a feature flag.
 *
 * Behavior:
 * - Runs once when the app initially opens.
 * - If the `otaUpdatesEnabled` flag is on and the app is not in development, checks for an OTA update via `checkForUpdateAsync`.
 * - When a new OTA update is downloaded (`fetchUpdateAsync().isNew === true`):
 * - If the user has not completed onboarding (e.g. fresh install, onboarding screen): the update is already fetched and will apply silently on next app launch (no reload, no modal).
 * - If the user has completed onboarding (wallet screen): navigates to the `OTAUpdatesModal` bottom sheet after interactions complete; the modal calls `reloadAsync` when the user confirms.
 * - If no update is available or the fetched update is not new, logs and continues with the current version without blocking startup.
 */
export const useOTAUpdates = () => {
  const otaUpdatesEnabled = useSelector(selectOtaUpdatesEnabledFlag);
  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const navigation = useNavigation();

  useEffect(() => {
    const hadCompletedOnboarding = completedOnboarding;

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
              if (hadCompletedOnboarding) {
                navigation.navigate(...createOTAUpdatesModalNavDetails());
              } else {
                Logger.log(
                  'OTA Updates: New update available on onboarding, will apply on next launch',
                );
              }
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
    // Intentionally omit completedOnboarding: we use its value at check start time
    // so that finishing onboarding in the same session does not re-run the check
    // and show the modal (update stays deferred to next launch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, otaUpdatesEnabled]);
};
