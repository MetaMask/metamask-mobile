/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
import React, { FC, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useAccounts } from '../../../../components/hooks/useAccounts';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';

import { Props } from './NotificationsSettings.types';
import createStyles from './NotificationsSettings.styles';
import NotificationOptionToggle from './NotificationOptionToggle';
import { NotificationsToggleTypes } from './NotificationsSettings.constants';

import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/pushNotifications';

import { requestPushNotificationsPermission } from '../../../../util/notifications';
import Routes from '../../../../constants/navigation/Routes';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import { SessionHeader } from './sectionHeader';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import { useAccountSettingsProps } from '../../../../util/notifications/hooks/useSwitchNotifications';

const NotificationsSettings = ({ navigation, route }: Props) => {
  const { accounts } = useAccounts();
  const accountAddresses = useMemo(
    () => accounts.map((a) => a.address),
    [accounts],
  );
  const accountSettingsProps = useAccountSettingsProps(accountAddresses);
  const { enableNotifications } = useEnableNotifications();

  const theme = useTheme();
  // Selectors
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  // Params
  const isFullScreenModal = route?.params?.isFullScreenModal;
  // Style
  const { colors } = theme;
  const styles = createStyles(colors);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const toggleNotificationsEnabled = async () => {
    if (!isMetamaskNotificationsEnabled) {
      const notificationSettings = await requestPushNotificationsPermission();
      if (
        notificationSettings &&
        notificationSettings.authorizationStatus >= 1
      ) {
        await enableNotifications();
      }
    }
  };

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.notifications_title'),
        navigation,
        isFullScreenModal,
        colors,
        null,
      ),
    );
  }, [colors, isFullScreenModal, navigation]);

  const MainNotificationSettings: FC = () => (
    <>
      <Pressable
        style={styles.switchElement}
        onPressOut={toggleNotificationsEnabled}
      >
        <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.allow_notifications')}
        </Text>
        <Switch
          disabled={isMetamaskNotificationsEnabled}
          value={isMetamaskNotificationsEnabled}
          onChange={toggleNotificationsEnabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
        />
      </Pressable>
      <View style={styles.setting}>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {strings('app_settings.allow_notifications_desc')}
        </Text>
      </View>
    </>
  );

  // TODO - we need a loading state for when initially fetching notification settings (e.g. account settings)
  return (
    <ScrollView style={styles.wrapper}>
      <MainNotificationSettings />
      {isMetamaskNotificationsEnabled && (
        <>
          <SessionHeader
            title={strings(
              'app_settings.notifications_opts.account_session_title',
            )}
            description={strings(
              'app_settings.notifications_opts.account_session_desc',
            )}
            styles={styles}
          />
          {accounts.map((account) => (
            <NotificationOptionToggle
              type={NotificationsToggleTypes.ACCOUNT}
              icon={accountAvatarType}
              key={account.address}
              title={account.name}
              address={account.address}
              disabledSwitch={
                accountSettingsProps.initialLoading ||
                accountSettingsProps.accountsBeingUpdated.length > 0
              }
              isLoading={accountSettingsProps.accountsBeingUpdated.includes(
                account.address,
              )}
              isEnabled={
                accountSettingsProps.data?.[account.address.toLowerCase()] ??
                false
              }
              refetchAccountSettings={async () => {
                await accountSettingsProps.update(accountAddresses);
              }}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
};

export default NotificationsSettings;

NotificationsSettings.navigationOptions = ({
  navigation,
  isNotificationEnabled,
}: {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  isNotificationEnabled: boolean;
}) => ({
  headerLeft: () => (
    <ButtonIcon
      size={ButtonIconSizes.Lg}
      iconName={IconName.ArrowLeft}
      onPress={() =>
        !isNotificationEnabled
          ? navigation.navigate(Routes.WALLET.HOME)
          : navigation.goBack()
      }
      style={{ marginHorizontal: 16 }}
    />
  ),
});
