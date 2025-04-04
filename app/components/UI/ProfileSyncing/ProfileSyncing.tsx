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
import {
  useEnableProfileSyncing,
  useDisableProfileSyncing,
} from '../../../util/identity/hooks/useProfileSyncing';
import { RootState } from '../../../reducers';
import { useSelector } from 'react-redux';
import {
  selectIsProfileSyncingEnabled,
  selectIsProfileSyncingUpdateLoading,
} from '../../../selectors/identity';
import Routes from '../../../constants/navigation/Routes';
import SwitchLoadingModal from '../Notification/SwitchLoadingModal';

const ProfileSyncingComponent = ({
  handleSwitchToggle,
}: Readonly<ProfileSyncingComponentProps>) => {
  const theme = useTheme();
  const { colors } = theme;

  const [loadingMessage, setLoadingMessage] = React.useState('');

  const navigation = useNavigation();

  const isProfileSyncingUpdateLoading = useSelector(
    selectIsProfileSyncingUpdateLoading,
  );
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);
  const isBasicFunctionalityEnabled = useSelector((state: RootState) =>
    Boolean(state?.settings?.basicFunctionalityEnabled),
  );

  const { enableProfileSyncing, error: enableProfileSyncingError } =
    useEnableProfileSyncing();
  const { disableProfileSyncing, error: disableProfileSyncingError } =
    useDisableProfileSyncing();

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  };

  const handleProfileSyncingToggle = async () => {
    if (isProfileSyncingEnabled) {
      setLoadingMessage(strings('app_settings.disabling_profile_sync'));
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.PROFILE_SYNCING,
      });
    } else {
      setLoadingMessage(strings('app_settings.enabling_profile_sync'));
      InteractionManager.runAfterInteractions(async () => {
        await enableProfileSyncing();
      });
    }
  };

  const onChange = () => {
    handleProfileSyncingToggle();
    handleSwitchToggle();
  };

  const modalError =
    enableProfileSyncingError ?? disableProfileSyncingError ?? undefined;

  useEffect(() => {
    const reactToBasicFunctionalityBeingDisabled = async () => {
      if (!isBasicFunctionalityEnabled) {
        setLoadingMessage(strings('app_settings.disabling_profile_sync'));
        InteractionManager.runAfterInteractions(async () => {
          await disableProfileSyncing();
        });
      }
    };
    reactToBasicFunctionalityBeingDisabled();
  }, [isBasicFunctionalityEnabled, disableProfileSyncing]);

  return (
    <View style={styles.setting}>
      <View style={styles.heading}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('profile_sync.title')}
        </Text>
        <Switch
          value={!!isProfileSyncingEnabled}
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
        loading={isProfileSyncingUpdateLoading}
        loadingText={loadingMessage}
        error={modalError}
      />
    </View>
  );
};

export default ProfileSyncingComponent;
