import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './NotificationsSettings.styles';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../locales/i18n';
import { type NotificationPreferenceSection } from './hooks/useNotificationStoragePreferences';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import Routes from '../../../../constants/navigation/Routes';
import { NotificationSettingsSectionContent } from './NotificationSettingsSectionContent';

export interface NotificationSettingsSectionProps {
  navigation: NavigationProp<ParamListBase>;
  route: RouteProp<
    {
      params: {
        type: NotificationPreferenceSection;
        title: string;
        description: string;
      };
    },
    'params'
  >;
}

const NotificationSettingsSection = ({
  navigation,
  route,
}: NotificationSettingsSectionProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const { type, title, description } = route.params;
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  useEffect(() => {
    if (!isMetamaskNotificationsEnabled) {
      navigation.dispatch(StackActions.replace(Routes.SETTINGS.NOTIFICATIONS));
    }
  }, [isMetamaskNotificationsEnabled, navigation]);

  if (!isMetamaskNotificationsEnabled) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <HeaderCompactStandard
        title={strings('app_settings.notifications_title')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <NotificationSettingsSectionContent
          type={type}
          title={title}
          description={description}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationSettingsSection;
