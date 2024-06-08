/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
import React, { FC, useEffect } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { camelCase } from 'lodash';

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
import notificationsRows from './notificationsRows';
import {
  NotificationsToggleTypes,
  NotificationsViewSelectorsIDs,
} from './NotificationsSettings.constants';

import {
  notificationSettings as defaultDisabledNotificationSettings,
  mmStorage,
  requestPushNotificationsPermission,
} from '../../../../util/notifications';
import { updateNotificationStatus } from '../../../../actions/notification';
import { STORAGE_IDS } from '../../../../util/notifications/settings/storage/constants';
import Routes from '../../../../constants/navigation/Routes';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';

/**
 * TODO: Discuss the granularity of the notifications settings.
 * i.e. Users can turn off all notifications for a particular account, for all accounts, or some notifications to account A, but not for account B.
 *
 */
interface SessionHeaderProps {
  title: string;
  description: string;
  styles: ReturnType<typeof createStyles>;
}

const SessionHeader = ({ title, description, styles }: SessionHeaderProps) => (
  <>
    <View style={styles.switchElement}>
      <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
        {title}
      </Text>
    </View>
    <View style={styles.setting}>
      <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
        {description}
      </Text>
    </View>
  </>
);

const NotificationsSettings = ({ navigation, route }: Props) => {
  const notificationsSettingsState = useSelector(
    (state: any) => state.notification.notificationsSettings,
  );

  const isNotificationEnabled = notificationsSettingsState?.isEnabled;

  const dispatch = useDispatch();
  const { accounts } = useAccounts();

  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const toggleNotificationsEnabled = () => {
    !isNotificationEnabled
      ? requestPushNotificationsPermission()
      : dispatch(
          updateNotificationStatus({
            isEnabled: false,
            notificationsOpts: defaultDisabledNotificationSettings,
            accounts: [],
          }),
        );
  };

  const isFullScreenModal = route?.params?.isFullScreenModal;

  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  useEffect(() => {
    notificationsSettingsState &&
      mmStorage.saveLocal(
        STORAGE_IDS.NOTIFICATIONS_SETTINGS,
        JSON.stringify(notificationsSettingsState),
      );
  }, [notificationsSettingsState]);

  useEffect(
    () => {
      navigation.setOptions(
        getNavigationOptionsTitle(
          strings('app_settings.notifications_title'),
          navigation,
          isFullScreenModal,
          colors,
          null,
        ),
      );
      dispatch(
        updateNotificationStatus({
          ...notificationsSettingsState,
          accounts:
            notificationsSettingsState?.accounts ??
            accounts.reduce((acc: { [key: string]: boolean }, account) => {
              acc[account.address] = true;
              return acc;
            }, {}),
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

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
          disabled={!isNotificationEnabled}
          value={isNotificationEnabled}
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

  return (
    <ScrollView style={styles.wrapper}>
      <MainNotificationSettings />
      {notificationsSettingsState?.isEnabled && (
        <>
          <SessionHeader
            title={strings(
              'app_settings.notifications_opts.customize_session_title',
            )}
            description={strings(
              'app_settings.notifications_opts.customize_session_desc',
            )}
            styles={styles}
          />
          {notificationsRows.map((opt) => (
            <NotificationOptionToggle
              type={NotificationsToggleTypes.ACTIONS}
              key={opt.title}
              icon={opt.icon}
              title={opt.title}
              description={opt.description}
              value={
                notificationsSettingsState.notificationsOpts[
                  camelCase(opt.title)
                ]
              }
              onOptionUpdated={(value) => {
                dispatch(
                  updateNotificationStatus({
                    ...notificationsSettingsState,
                    notificationsOpts: {
                      ...notificationsSettingsState.notificationsOpts,
                      [camelCase(opt.title)]: value,
                    },
                  }),
                );
              }}
              testId={NotificationsViewSelectorsIDs[opt.title]}
              disabled={opt.disabled}
            />
          ))}
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
              description={account.address}
              value={
                notificationsSettingsState?.accounts[account.address] ?? true
              }
              onOptionUpdated={(value) => {
                dispatch(
                  updateNotificationStatus({
                    ...notificationsSettingsState,
                    accounts: {
                      ...notificationsSettingsState.accounts,
                      [account.address]: value,
                    },
                  }),
                );
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
