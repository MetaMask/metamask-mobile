import React, { FC, useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { camelCase } from 'lodash';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { STORAGE_IDS } from '../../../../util/notifications/settings/storage/constants';

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

import { updateNotificationStatus } from '../../../../actions/notification';
import { mmStorage } from '../../../../util/notifications';

/**
 * TODO: Discuss the granularity of the notifications settings.
 * i.e. Users can turn off all notifications for a particular account, for all accounts, or some notifications to account A, but not for account B.
 *
 */
interface NotificationsSettingsStoreKey {
  isEnabled: boolean;
  notificationsOpts: {
    [key: string]: boolean;
  };
  accounts: {
    [key: string]: boolean;
  };
}
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
  const dispatch = useDispatch();
  const notificationsSettingsCurrentState = useSelector(
    (state: any) => state.notification.notificationsSettings,
  );
  const { accounts } = useAccounts();

  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const [notificationsSettings, setNotificationsSettings] =
    useState<NotificationsSettingsStoreKey>(notificationsSettingsCurrentState);

  const toggleNotificationsEnabled = () => {
    setNotificationsSettings({
      isEnabled: !notificationsSettings?.isEnabled,
      notificationsOpts: {
        assetsReceived: true,
        assetsSent: true,
        deFi: true,
        productAnnouncements: true,
        snaps: true,
      },
      accounts: accounts.reduce((acc: { [key: string]: boolean }, account) => {
        acc[account.address] = true;
        return acc;
      }, {}),
    });
  };

  const isFullScreenModal = route?.params?.isFullScreenModal;

  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  useEffect(() => {
    dispatch(updateNotificationStatus(notificationsSettings));
    mmStorage.saveLocal(
      STORAGE_IDS.NOTIFICATIONS_SETTINGS,
      JSON.stringify(notificationsSettings),
    );
  }, [dispatch, notificationsSettings]);

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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

  const MainNotificationSettings: FC = () => (
    <>
      <View style={styles.switchElement}>
        <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.allow_notifications')}
        </Text>
        <Switch
          value={notificationsSettings?.isEnabled}
          onValueChange={toggleNotificationsEnabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white['000']}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
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
      {notificationsSettings?.isEnabled && (
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
                notificationsSettings.notificationsOpts[camelCase(opt.title)]
              }
              onOptionUpdated={(value) => {
                setNotificationsSettings({
                  ...notificationsSettings,
                  notificationsOpts: {
                    ...notificationsSettings.notificationsOpts,
                    [camelCase(opt.title)]: value,
                  },
                });
                mmStorage.saveLocal(
                  STORAGE_IDS.NOTIFICATIONS_SETTINGS,
                  JSON.stringify(notificationsSettings),
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
              value={notificationsSettings.accounts[account.address]}
              onOptionUpdated={(value) => {
                setNotificationsSettings({
                  ...notificationsSettings,
                  accounts: {
                    ...notificationsSettings.accounts,
                    [account.address]: value,
                  },
                });
                mmStorage.saveLocal(
                  STORAGE_IDS.NOTIFICATIONS_SETTINGS,
                  JSON.stringify(notificationsSettings),
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
