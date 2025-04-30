import React from 'react';
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
  selectIsBackupAndSyncEnabled,
  selectIsBackupAndSyncUpdateLoading,
} from '../../../../selectors/identity';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/dist/controllers/user-storage/constants.cjs';
import Icon, {
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';

export const backupAndSyncFeaturesTogglesSections = [
  {
    id: 'accountSyncing',
    titleI18NKey: strings('backupAndSync.features.accounts'),
    iconName: IconName.UserCircle,
    backupAndSyncfeatureKey: BACKUPANDSYNC_FEATURES.accountSyncing,
    featureReduxSelector: selectIsAccountSyncingEnabled,
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
  const { setIsBackupAndSyncFeatureEnabled } = useBackupAndSync();

  const { colors } = theme;
  const isFeatureEnabled = useSelector(section.featureReduxSelector);

  const handleToggleFeature = async () => {
    InteractionManager.runAfterInteractions(async () => {
      await setIsBackupAndSyncFeatureEnabled(
        section.backupAndSyncfeatureKey,
        !isFeatureEnabled,
      );
    });
  };

  return (
    <View style={styles.featureView}>
      <View style={styles.featureNameAndIcon}>
        <Icon name={section.iconName} />
        <Text>{section.titleI18NKey}</Text>
      </View>
      <Switch
        value={isFeatureEnabled}
        disabled={!isBackupAndSyncEnabled || isBackupAndSyncUpdateLoading}
        onValueChange={handleToggleFeature}
        trackColor={{
          true: colors.primary.default,
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
