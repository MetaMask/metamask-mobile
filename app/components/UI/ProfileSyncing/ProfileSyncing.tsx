import React, { useEffect } from 'react';

import { View, Switch, Linking } from 'react-native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import styles from './ProfileSyncing.styles';
import { ProfileSyncingComponentProps } from './ProfileSyncing.types';
import AppConstants from '../../../core/AppConstants';
import { useProfileSyncing } from '../../../util/notifications/hooks/useProfileSyncing';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';

function ProfileSyncingComponent({
  handleSwitchToggle,
  isBasicFunctionalityEnabled,
  isProfileSyncingEnabled,
}: Readonly<ProfileSyncingComponentProps>) {
  const theme = useTheme();
  const { colors } = theme;
  const { disableProfileSyncing } = useProfileSyncing();

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  };

  useEffect(() => {
    async function disableProfileSyncingOnLogout() {
      if (!isBasicFunctionalityEnabled) {
        await disableProfileSyncing();
      }
    }
    disableProfileSyncingOnLogout();
  }, [disableProfileSyncing, isBasicFunctionalityEnabled]);

  return (
    <View style={styles.setting}>
      <View style={styles.heading}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('profile_sync.title')}
        </Text>
        <Switch
          value={isProfileSyncingEnabled ?? undefined}
          onChange={handleSwitchToggle}
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
    </View>
  );
}

export default function ProfileSyncingContainer(
  props: Readonly<ProfileSyncingComponentProps>,
) {
  if (!isNotificationsFeatureEnabled()) {
    return null;
  }

  return <ProfileSyncingComponent {...props} />;
}
