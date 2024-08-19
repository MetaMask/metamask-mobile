import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { View, Switch, Linking } from 'react-native';
import { RootState } from '../../../reducers';

import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import styles from './ProfileSyncing.styles';
import { ProfileSyncingComponentProps } from './ProfileSyncing.types';
import AppConstants from '../../../core/AppConstants';
import { selectIsProfileSyncingEnabled } from '../../../selectors/notifications';
import { useProfileSyncing } from '../../../util/notifications/hooks/useProfileSyncing';

export default function ProfileSyncingComponent({
  handleSwitchToggle,
}: Readonly<ProfileSyncingComponentProps>) {
  const theme = useTheme();
  const { colors } = theme;
  const { disableProfileSyncing } = useProfileSyncing();
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);
  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PRIVACY_POLICY_2024);
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
