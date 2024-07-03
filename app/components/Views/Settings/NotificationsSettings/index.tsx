/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
import React, { FC, useEffect, useMemo, useCallback } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useSelector } from 'react-redux';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

import { RootState } from '../../../../reducers';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useAccounts } from '../../../../components/hooks/useAccounts';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';

import SwitchLoadingModal from '../../../UI/Notification/SwitchLoadingModal';
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
import {
  useDisableNotifications,
  useEnableNotifications,
} from '../../../../util/notifications/hooks/useNotifications';
import { useAccountSettingsProps } from '../../../../util/notifications/hooks/useSwitchNotifications';

const NotificationsSettings = ({ navigation, route }: Props) => {
  const { accounts } = useAccounts();

  const accountAddresses = useMemo(
    () => accounts.map((a) => a.address),
    [accounts],
  );
  const accountSettingsProps = useAccountSettingsProps(accountAddresses);
  const {
    enableNotifications,
    loading: enableLoading,
    error: enablingError,
  } = useEnableNotifications();

  const {
    disableNotifications,
    loading: disableLoading,
    error: disablingError,
  } = useDisableNotifications();

  const loading = enableLoading || disableLoading;
  const errorText = enablingError || disablingError;
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

  const accountAvatarType = useSelector((state: RootState) =>
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
    } else {
      await disableNotifications();
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

  const renderAccounts = useCallback(() => {
    const refetchAccountSettings = async () => {
      await accountSettingsProps.update(accountAddresses);
    };

    return accounts.map((account) => (
      <NotificationOptionToggle
        type={NotificationsToggleTypes.ACCOUNT}
        icon={accountAvatarType}
        key={account.address}
        title={account.name}
        address={account.address}
        disabledSwitch={accountSettingsProps.initialLoading}
        isLoading={accountSettingsProps.accountsBeingUpdated.includes(
          account.address,
        )}
        isEnabled={
          accountSettingsProps.data?.[account.address.toLowerCase()] ?? false
        }
        refetchAccountSettings={refetchAccountSettings}
      />
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountSettingsProps]);

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
          {renderAccounts()}
        </>
      )}
      <SwitchLoadingModal
        loading={loading}
        loadingText={
          !isMetamaskNotificationsEnabled
            ? strings('app_settings.enabling_notifications')
            : strings('app_settings.disabling_notifications')
        }
        error={errorText}
      />
    </ScrollView>
  );
};

export default NotificationsSettings;

NotificationsSettings.navigationOptions = ({
  navigation,
  isNotificationEnabled,
}: {
  navigation: NavigationProp<ParamListBase>;
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
