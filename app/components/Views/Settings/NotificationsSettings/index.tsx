import React, { FC, useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { UpdatePPOMInitializationStatus } from '../../../../actions/experimental';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { useDispatch, useSelector } from 'react-redux';
import { Props } from './NotificationsSettings.types';
import createStyles from './NotificationsSettings.styles';
import NotificationOptionToggle from './NotificationOptionToggle';
import notificationsOpts from './notificationsOpts';
import {
  NotificationsToggleTypes,
  NotificationsViewSelectorsIDs,
} from './NotificationsSettings.constants';
import { useAccounts } from '../../../../components/hooks/useAccounts';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';

const storage = new MMKV(); // id: mmkv.default

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
/**
 * Main view for app Notifications Settings
 */
const NotificationsSettings = ({ navigation, route }: Props) => {
  const dispatch = useDispatch();
  const { accounts } = useAccounts();
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const [notificationsEnabled, setNotificationsEnabled] = useState<
    boolean | undefined
  >(false);

  const toggleNotificationsEnabled = () => {
    setNotificationsEnabled(!notificationsEnabled);
    storage.set('is-notifications-enabled', !notificationsEnabled);
  };

  const isFullScreenModal = route?.params?.isFullScreenModal;

  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  useEffect(() => {
    dispatch(UpdatePPOMInitializationStatus());
    setNotificationsEnabled(storage.getBoolean('is-notifications-enabled'));
  }, [dispatch, notificationsEnabled, navigation]);

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
          value={notificationsEnabled}
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
      {notificationsEnabled && (
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
          {notificationsOpts.map((opt) => (
            <NotificationOptionToggle
              type={NotificationsToggleTypes.ACTIONS}
              key={opt.title}
              icon={opt.icon}
              title={opt.title}
              description={opt.description}
              value={opt.value}
              // onOptionUpdated={}
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
              value={true}
              // onOptionUpdated={}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
};

export default NotificationsSettings;
