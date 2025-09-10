import React, { Fragment } from 'react';
import { Image, View, Linking, ScrollView } from 'react-native';

import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import EnableBackupAndSyncCardImage from '../../../../images/enableBackupAndSyncCard.png';
import { createStyles } from './TurnOnBackupAndSync.styles';
import AppConstants from '../../../../core/AppConstants';
import SwitchLoadingModal from '../../../UI/Notification/SwitchLoadingModal';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectIsBackupAndSyncEnabled } from '../../../../selectors/identity';
import Routes from '../../../../constants/navigation/Routes';
import { useBackupAndSync } from '../../../../util/identity/hooks/useBackupAndSync';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';

export const turnOnBackupAndSyncTestIds = {
  view: 'turn-on-backup-and-sync-view',
  cancelButton: 'turn-on-backup-and-sync-cancel-button',
  enableButton: 'turn-on-backup-and-sync-enable-button',
};

const TurnOnBackupAndSync = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();

  const { setIsBackupAndSyncFeatureEnabled } = useBackupAndSync();
  const { trackEvent, createEventBuilder } = useMetrics();

  const isBasicFunctionalityEnabled = useSelector((state: RootState) =>
    Boolean(state?.settings?.basicFunctionalityEnabled),
  );
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const goToLearnMore = () => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  };

  const trackEnableBackupAndSyncEvent = (newValue: boolean) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_UPDATED)
        .addProperties({
          settings_group: 'security_privacy',
          settings_type: 'profile_syncing',
          old_value: !newValue,
          new_value: newValue,
          was_notifications_on: isMetamaskNotificationsEnabled,
        })
        .build(),
    );
  };

  const handleGoBack = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED)
        .addProperties({
          feature_name: 'Backup And Sync Carousel Modal',
          action: 'Modal Dismissed',
        })
        .build(),
    );
    navigation.goBack();
  };

  const handleEnableBackupAndSync = async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED)
        .addProperties({
          feature_name: 'Backup And Sync Carousel Modal',
          action: 'Turned On',
        })
        .build(),
    );

    if (!isBasicFunctionalityEnabled) {
      navigation.navigate(Routes.SHEET.CONFIRM_TURN_ON_BACKUP_AND_SYNC, {
        enableBackupAndSync: async () => {
          navigation.navigate(Routes.SETTINGS_VIEW, {
            screen: Routes.SETTINGS.BACKUP_AND_SYNC,
          });
          await setIsBackupAndSyncFeatureEnabled(
            BACKUPANDSYNC_FEATURES.main,
            true,
          );
        },
        trackEnableBackupAndSyncEvent,
      });
      return;
    }
    if (!isBackupAndSyncEnabled) {
      await setIsBackupAndSyncFeatureEnabled(BACKUPANDSYNC_FEATURES.main, true);
    }
    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.BACKUP_AND_SYNC,
    });
  };

  return (
    <Fragment>
      <View style={styles.wrapper} testID={turnOnBackupAndSyncTestIds.view}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.textTitle}
        >
          {strings('backupAndSync.enable.title')}
        </Text>
        <ScrollView>
          <View style={styles.card}>
            <Image source={EnableBackupAndSyncCardImage} style={styles.image} />
          </View>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.textSpace}
          >
            {strings('backupAndSync.enable.description')}{' '}
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Info}
              onPress={goToLearnMore}
            >
              {strings('backupAndSync.privacyLink')}
            </Text>
          </Text>
          <Text
            style={styles.textSettings}
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
          >
            {strings('backupAndSync.enable.updatePreferences')}
          </Text>
          <Text variant={TextVariant.BodyMDBold}>
            {strings('backupAndSync.enable.settingsPath')}
          </Text>
        </ScrollView>

        <View style={styles.btnContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('notifications.activation_card.cancel')}
            onPress={handleGoBack}
            style={styles.ctaBtn}
            testID={turnOnBackupAndSyncTestIds.cancelButton}
          />
          <Button
            variant={ButtonVariants.Primary}
            label={strings('notifications.activation_card.cta')}
            onPress={handleEnableBackupAndSync}
            style={styles.ctaBtn}
            testID={turnOnBackupAndSyncTestIds.enableButton}
          />
        </View>
      </View>
      <SwitchLoadingModal
        loading={false}
        loadingText={strings('app_settings.enabling_notifications')}
      />
    </Fragment>
  );
};

export default TurnOnBackupAndSync;
