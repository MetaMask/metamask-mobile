import { useEffect, useState } from 'react';
import { checkForUpdateAsync, fetchUpdateAsync } from 'expo-updates';
import { InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import Logger from '../../util/Logger';
import { useFeatureFlag, FeatureFlagNames } from './useFeatureFlag';
import { createOTAUpdateModalNavDetails } from '../UI/OTAUpdateModal/OTAUpdateModal';

/**
 * Hook to manage OTA updates based on feature flag.
 *
 * Behavior:
 * - Checks for updates once when app initially opens if feature flag is enabled.
 * - If an update is available and new, downloads it and exposes `hasUpdateAvailable: true`.
 * - Does NOT reload the app automatically; consumers are responsible for calling `reloadAsync`.
 * - Returns `isCheckingUpdates` to gate rendering until check is complete.
 */
export const useOTAUpdates = () => {
  const otaUpdatesEnabled = useFeatureFlag(FeatureFlagNames.otaUpdatesEnabled);
  const navigation = useNavigation();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(true);
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      console.log('checkForUpdates========');
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate(...createOTAUpdateModalNavDetails());
      });

      // if (!otaUpdatesEnabled) {
      //   setIsCheckingUpdates(false);
      //   setHasUpdateAvailable(false);
      //   return;
      // }

      // if (__DEV__) {
      //   setIsCheckingUpdates(false);
      //   setHasUpdateAvailable(false);
      //   return;
      // }

      try {
        // const update = await checkForUpdateAsync();

        if (true) {
          const fetchResult = await fetchUpdateAsync();

          if (true) {
            setHasUpdateAvailable(true);
            console.log('navigate to ota update modal');
            navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
              screen: Routes.MODAL.OTA_UPDATE_MODAL,
            });
          } else {
            Logger.log('OTA Updates: Update fetched but not new');
            setHasUpdateAvailable(false);
          }
        } else {
          Logger.log('OTA Updates: No updates available');
          setHasUpdateAvailable(false);
        }
      } catch (error) {
        Logger.error(
          error as Error,
          'OTA Updates: Error checking for updates, continuing with current version',
        );
        setHasUpdateAvailable(false);
      } finally {
        setIsCheckingUpdates(false);
      }
    };

    checkForUpdates();
  }, [navigation, otaUpdatesEnabled]);

  return {
    isCheckingUpdates,
    hasUpdateAvailable,
  };
};
