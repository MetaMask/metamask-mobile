import React, { useEffect } from 'react';

import { View, Switch, Linking, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import styles from './ProfileSyncing.styles';
import { ProfileSyncingComponentProps } from './ProfileSyncing.types';
import AppConstants from '../../../core/AppConstants';
import { useBackupAndSync } from '../../../util/identity/hooks/useBackupAndSync';
import { RootState } from '../../../reducers';
import { useSelector } from 'react-redux';
import {
  selectIsBackupAndSyncEnabled,
  selectIsBackupAndSyncUpdateLoading,
} from '../../../selectors/identity';
import Routes from '../../../constants/navigation/Routes';
import SwitchLoadingModal from '../Notification/SwitchLoadingModal';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';

const ProfileSyncingComponent = ({
  handleSwitchToggle,
}: Readonly<ProfileSyncingComponentProps>) => {
  const theme = useTheme();
  const { colors } = theme;

  const [loadingMessage, setLoadingMessage] = React.useState('');

  const navigation = useNavigation();

  const isBackupAndSyncUpdateLoading = useSelector(
    selectIsBackupAndSyncUpdateLoading,
  );
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);
  const isBasicFunctionalityEnabled = useSelector((state: RootState) =>
    Boolean(state?.settings?.basicFunctionalityEnabled),
  );

  const { error, setIsBackupAndSyncFeatureEnabled } = useBackupAndSync();

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  };

  const handleProfileSyncingToggle = async () => {
    if (isBackupAndSyncEnabled) {
      setLoadingMessage(strings('app_settings.disabling_profile_sync'));
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.PROFILE_SYNCING,
      });
    } else {
      setLoadingMessage(strings('app_settings.enabling_profile_sync'));
      InteractionManager.runAfterInteractions(async () => {
        await setIsBackupAndSyncFeatureEnabled(
          BACKUPANDSYNC_FEATURES.main,
          true,
        );
      });
    }
  };

  const onChange = () => {
    handleProfileSyncingToggle();
    handleSwitchToggle();
  };

  const modalError = error ?? undefined;

  useEffect(() => {
    const reactToBasicFunctionalityBeingDisabled = async () => {
      if (!isBasicFunctionalityEnabled) {
        setLoadingMessage(strings('app_settings.disabling_profile_sync'));
        InteractionManager.runAfterInteractions(async () => {
          await setIsBackupAndSyncFeatureEnabled(
            BACKUPANDSYNC_FEATURES.main,
            false,
          );
        });
      }
    };
    reactToBasicFunctionalityBeingDisabled();
  }, [isBasicFunctionalityEnabled, setIsBackupAndSyncFeatureEnabled]);

  return (
    <View style={styles.setting}>
      <View style={styles.heading}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('profile_sync.title')}
        </Text>
        <Switch
          value={!!isBackupAndSyncEnabled}
          onValueChange={onChange}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          ios_backgroundColor={colors.border.muted}
          disabled={!isBasicFunctionalityEnabled}
        />
      </View>
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {strings('profile_sync.enable_description')}
        <Text color={TextColor.Info} onPress={handleLink}>
          {strings('profile_sync.enable_privacy_link')}
        </Text>
      </Text>
      <SwitchLoadingModal
        loading={isBackupAndSyncUpdateLoading}
        loadingText={loadingMessage}
        error={modalError}
      />
    </View>
  );
};

export default ProfileSyncingComponent;
