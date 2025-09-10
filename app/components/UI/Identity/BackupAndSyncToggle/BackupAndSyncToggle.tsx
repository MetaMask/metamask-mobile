import React, { useCallback, useEffect } from 'react';

import { View, Switch, Linking, InteractionManager } from 'react-native';
// import { useNavigation } from '@react-navigation/native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
// import { strings } from '../../../../../locales/i18n';
import styles from './BackupAndSyncToggle.styles';
import AppConstants from '../../../../core/AppConstants';
import { useBackupAndSync } from '../../../../util/identity/hooks/useBackupAndSync';
import { RootState } from '../../../../reducers';
import { useSelector } from 'react-redux';
import {
  selectIsBackupAndSyncEnabled,
  selectIsBackupAndSyncUpdateLoading,
} from '../../../../selectors/identity';
// import Routes from '../../../../constants/navigation/Routes';
import SwitchLoadingModal from '../../Notification/SwitchLoadingModal';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import Routes from '../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';

interface Props {
  trackBackupAndSyncToggleEventOverride?: (newValue: boolean) => void;
}

const BackupAndSyncToggle = ({
  trackBackupAndSyncToggleEventOverride,
}: Readonly<Props>) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const { colors } = theme;

  const { setIsBackupAndSyncFeatureEnabled, error } = useBackupAndSync();

  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isBackupAndSyncUpdateLoading = useSelector(
    selectIsBackupAndSyncUpdateLoading,
  );
  const isBasicFunctionalityEnabled = useSelector((state: RootState) =>
    Boolean(state?.settings?.basicFunctionalityEnabled),
  );
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  useEffect(() => {
    const reactToBasicFunctionalityBeingDisabled = async () => {
      if (!isBasicFunctionalityEnabled && isBackupAndSyncEnabled) {
        InteractionManager.runAfterInteractions(async () => {
          await setIsBackupAndSyncFeatureEnabled(
            BACKUPANDSYNC_FEATURES.main,
            false,
          );
        });
      }
    };
    reactToBasicFunctionalityBeingDisabled();
  }, [
    isBasicFunctionalityEnabled,
    setIsBackupAndSyncFeatureEnabled,
    isBackupAndSyncEnabled,
  ]);

  const trackBackupAndSyncToggleEvent = useCallback(
    (newValue: boolean) => {
      if (trackBackupAndSyncToggleEventOverride) {
        trackBackupAndSyncToggleEventOverride(newValue);
        return;
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.SETTINGS_UPDATED)
          .addProperties({
            settings_group: 'backup_and_sync',
            settings_type: 'main',
            old_value: !newValue,
            new_value: newValue,
            was_notifications_on: isMetamaskNotificationsEnabled,
          })
          .build(),
      );
    },
    [
      isMetamaskNotificationsEnabled,
      trackEvent,
      createEventBuilder,
      trackBackupAndSyncToggleEventOverride,
    ],
  );

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  };

  const handleBackupAndSyncToggleSetValue = async () => {
    if (isBackupAndSyncEnabled) {
      trackBackupAndSyncToggleEvent(false);

      InteractionManager.runAfterInteractions(async () => {
        await setIsBackupAndSyncFeatureEnabled(
          BACKUPANDSYNC_FEATURES.main,
          false,
        );
      });
    } else {
      trackBackupAndSyncToggleEvent(true);

      if (!isBasicFunctionalityEnabled) {
        navigation.navigate(Routes.SHEET.CONFIRM_TURN_ON_BACKUP_AND_SYNC, {
          enableBackupAndSync: async () => {
            await setIsBackupAndSyncFeatureEnabled(
              BACKUPANDSYNC_FEATURES.main,
              true,
            );
          },
          trackEnableBackupAndSyncEvent: () =>
            trackBackupAndSyncToggleEvent(true),
        });
      } else {
        InteractionManager.runAfterInteractions(async () => {
          await setIsBackupAndSyncFeatureEnabled(
            BACKUPANDSYNC_FEATURES.main,
            true,
          );
        });
      }
    }
  };

  return (
    <View style={styles.setting}>
      <View style={styles.heading}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('backupAndSync.title')}
        </Text>
        <Switch
          value={!!isBackupAndSyncEnabled}
          onValueChange={handleBackupAndSyncToggleSetValue}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          ios_backgroundColor={colors.border.muted}
          testID="toggle-backupAndSync"
        />
      </View>
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {strings('backupAndSync.enable.description')}
        <Text color={TextColor.Info} onPress={handleLink}>
          {strings('backupAndSync.privacyLink')}
        </Text>
      </Text>

      <SwitchLoadingModal
        loading={isBackupAndSyncUpdateLoading}
        loadingText=""
        error={error || undefined}
      />
    </View>
  );
};

export default BackupAndSyncToggle;
