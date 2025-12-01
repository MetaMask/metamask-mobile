import React, { useCallback, useMemo } from 'react';
import { View, Switch, InteractionManager } from 'react-native';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import styles from './BackupAndSyncFeaturesToggles.styles';
import { useBackupAndSync } from '../../../../util/identity/hooks/useBackupAndSync';
import { useSelector } from 'react-redux';
import {
  selectIsAccountSyncingEnabled,
  selectIsContactSyncingEnabled,
  selectIsBackupAndSyncEnabled,
  selectIsBackupAndSyncUpdateLoading,
} from '../../../../selectors/identity';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import Icon, {
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

export const backupAndSyncFeaturesTogglesSections = [
  {
    id: 'accounts',
    titleI18NKey: strings('backupAndSync.features.accounts'),
    iconName: IconName.UserCircle,
    backupAndSyncfeatureKey: BACKUPANDSYNC_FEATURES.accountSyncing,
    featureReduxSelector: selectIsAccountSyncingEnabled,
    testID: 'toggle-accountSyncing',
  },
  {
    id: 'contacts',
    titleI18NKey: strings('backupAndSync.features.contacts'),
    iconName: IconName.Book,
    backupAndSyncfeatureKey: BACKUPANDSYNC_FEATURES.contactSyncing,
    featureReduxSelector: selectIsContactSyncingEnabled,
    testID: 'toggle-contactSyncing',
  },
];

const FeatureToggle = ({
  section,
  isBackupAndSyncUpdateLoading,
  isBackupAndSyncEnabled,
}: {
  section: (typeof backupAndSyncFeaturesTogglesSections)[number];
  isBackupAndSyncUpdateLoading: boolean;
  isBackupAndSyncEnabled: boolean;
}) => {
  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { setIsBackupAndSyncFeatureEnabled } = useBackupAndSync();

  const { colors } = theme;
  const isFeatureEnabled = useSelector(section.featureReduxSelector);

  const trackBackupAndSyncToggleEvent = useCallback(
    (newValue: boolean) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SETTINGS_UPDATED)
          .addProperties({
            settings_group: 'backup_and_sync',
            settings_type: section.id,
            old_value: !newValue,
            new_value: newValue,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder, section.id],
  );

  const handleToggleFeature = async () => {
    trackBackupAndSyncToggleEvent(!isFeatureEnabled);
    InteractionManager.runAfterInteractions(async () => {
      await setIsBackupAndSyncFeatureEnabled(
        section.backupAndSyncfeatureKey,
        !isFeatureEnabled,
      );
    });
  };

  const isDisabled = useMemo(
    () => !isBackupAndSyncEnabled || isBackupAndSyncUpdateLoading,
    [isBackupAndSyncEnabled, isBackupAndSyncUpdateLoading],
  );

  return (
    <View style={styles.featureView}>
      <View style={styles.featureNameAndIcon}>
        <Icon name={section.iconName} />
        <Text>{section.titleI18NKey}</Text>
      </View>
      <Switch
        testID={section.testID}
        value={isFeatureEnabled}
        disabled={isDisabled}
        onValueChange={handleToggleFeature}
        trackColor={{
          // The ternary is here because for Android, the disabled state still shows the track color as `colors.primary.default` where IOS does not
          // exhibit this behavior. https://github.com/MetaMask/metamask-mobile/issues/20034
          true:
            isFeatureEnabled && !isDisabled
              ? colors.primary.default
              : colors.border.muted,
          false: colors.border.muted,
        }}
        thumbColor={theme.brandColors.white}
        ios_backgroundColor={colors.border.muted}
      />
    </View>
  );
};

const BackupAndSyncFeaturesToggles = () => {
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isBackupAndSyncUpdateLoading = useSelector(
    selectIsBackupAndSyncUpdateLoading,
  );

  return (
    <View style={styles.setting}>
      <View style={styles.heading}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('backupAndSync.manageWhatYouSync.title')}
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {strings('backupAndSync.manageWhatYouSync.description')}
        </Text>
      </View>

      {backupAndSyncFeaturesTogglesSections.map((section) => (
        <FeatureToggle
          key={section.id}
          section={section}
          isBackupAndSyncUpdateLoading={isBackupAndSyncUpdateLoading}
          isBackupAndSyncEnabled={isBackupAndSyncEnabled}
        />
      ))}
    </View>
  );
};

export default BackupAndSyncFeaturesToggles;
