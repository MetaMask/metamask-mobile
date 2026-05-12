import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

import { useStyles } from '../../../../component-library/hooks';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import SwitchLoadingModal from '../../../UI/Notification/SwitchLoadingModal';
import { Props } from './NotificationsSettings.types';

import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';

import Routes from '../../../../constants/navigation/Routes';

import { useSwitchNotificationLoadingText } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { MainNotificationToggle } from './MainNotificationToggle';
import styleSheet from './NotificationsSettings.styles';
import { useNotificationStoragePreferences } from './hooks/useNotificationStoragePreferences';

import {
  Box,
  Text,
  Icon,
  IconName,
  IconColor,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

interface NotificationRowProps {
  title: string;
  status: string;
  iconName: IconName;
  onPress: () => void;
}

const NotificationRow = ({
  title,
  status,
  iconName,
  onPress,
}: NotificationRowProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  return (
    <TouchableOpacity style={styles.switchElement} onPress={onPress}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Icon name={iconName} color={IconColor.IconAlternative} />
        <Box twClassName="ml-4">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {title}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {status}
          </Text>
        </Box>
      </Box>
      <Icon name={IconName.ArrowRight} color={IconColor.IconAlternative} />
    </TouchableOpacity>
  );
};

const getStatusText = (prefs: Record<string, boolean>) => {
  const active = [];
  if (prefs?.pushNotificationsEnabled) {
    active.push('Push');
  }
  if (prefs?.inAppNotificationsEnabled) {
    active.push('In app');
  }
  return active.length > 0 ? active.join(', ') : 'Off';
};

const NotificationsSettings = ({ navigation }: Props) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const loadingText = useSwitchNotificationLoadingText();
  const { preferences } = useNotificationStoragePreferences();

  const navigateToSection = (
    type: string,
    title: string,
    description: string,
    showAccountsList = false,
  ) => {
    navigation.navigate(Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION, {
      type,
      title,
      description,
      showAccountsList,
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <HeaderCompactStandard onBack={navigation.goBack} />
      <ScrollView style={styles.container}>
        <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
          {strings('app_settings.notifications_title')}
        </Text>
        <MainNotificationToggle />

        {isMetamaskNotificationsEnabled && (
          <>
            <NotificationRow
              title={strings(
                'app_settings.notifications_opts.wallet_activity_title',
              )}
              status={getStatusText(preferences.walletActivity)}
              iconName={IconName.Clock}
              onPress={() =>
                navigateToSection(
                  'walletActivity',
                  strings(
                    'app_settings.notifications_opts.wallet_activity_title',
                  ),
                  strings(
                    'app_settings.notifications_opts.wallet_activity_desc',
                  ),
                  true,
                )
              }
            />

            <NotificationRow
              title={strings('app_settings.notifications_opts.perps_title')}
              status={getStatusText(preferences.perps)}
              iconName={IconName.Global}
              onPress={() =>
                navigateToSection(
                  'perps',
                  strings('app_settings.notifications_opts.perps_title'),
                  strings('app_settings.notifications_opts.perps_desc'),
                )
              }
            />

            {/* Temporarily disabled until we match/replace social AI preferences
            <NotificationRow
              title={strings('app_settings.notifications_opts.social_ai_title')}
              status={getStatusText(preferences.socialAI)}
              iconName={IconName.Ai}
              onPress={() =>
                navigateToSection(
                  'socialAI',
                  strings('app_settings.notifications_opts.social_ai_title'),
                  strings('app_settings.notifications_opts.social_ai_desc'),
                )
              }
            /> */}

            <NotificationRow
              title={strings('app_settings.notifications_opts.marketing_title')}
              status={getStatusText(preferences.marketing)}
              iconName={IconName.Campaign}
              onPress={() =>
                navigateToSection(
                  'marketing',
                  strings('app_settings.notifications_opts.marketing_title'),
                  strings('app_settings.notifications_opts.marketing_desc'),
                )
              }
            />
          </>
        )}
        <SwitchLoadingModal
          loading={!!loadingText}
          loadingText={loadingText ?? ''}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsSettings;
