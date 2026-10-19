import React, { useCallback, useEffect } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

import { useStyles } from '../../../../component-library/hooks';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { Props } from './NotificationsSettings.types';

import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';

import Routes from '../../../../constants/navigation/Routes';

import { MainNotificationToggle } from './MainNotificationToggle';
import styleSheet from './NotificationsSettings.styles';
import {
  useNotificationStoragePreferences,
  type NotificationPreferenceSection,
} from './hooks/useNotificationStoragePreferences';
import {
  getNotificationSettingsSectionRouteParams,
  NOTIFICATION_SETTINGS_SECTIONS,
  resolveNotificationSettingsSection,
  type NotificationSettingsSectionConfig,
} from './notificationSettingsSections';

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
  IconSize,
} from '@metamask/design-system-react-native';
import { NotificationPreferences } from '@metamask/authenticated-user-storage';

interface NotificationRowProps {
  title: string;
  /** Channels summary shown under the title. Omitted for wallet activity,
   * whose per-account settings have no channel toggles to summarize. */
  status?: string;
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
    <TouchableOpacity
      style={[styles.switchElement, styles.notificationRow]}
      onPress={onPress}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Icon
          name={iconName}
          color={IconColor.IconAlternative}
          size={IconSize.Lg}
        />
        <Box twClassName="ml-4">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {title}
          </Text>
          {status ? (
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {status}
            </Text>
          ) : null}
        </Box>
      </Box>
      <Icon name={IconName.ArrowRight} color={IconColor.IconAlternative} />
    </TouchableOpacity>
  );
};

type NotificationPreferenceStatus =
  NotificationPreferences[NotificationPreferenceSection];

const getStatusText = (prefs?: NotificationPreferenceStatus | null) => {
  const active = [];
  if (prefs?.pushNotificationsEnabled) {
    active.push(strings('app_settings.notifications_opts.status_push'));
  }
  if (prefs?.inAppNotificationsEnabled) {
    active.push(strings('app_settings.notifications_opts.status_in_app'));
  }
  return active.length > 0
    ? active.join(', ')
    : strings('app_settings.notifications_opts.status_off');
};

const NotificationsSettings = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );

  const { preferences } = useNotificationStoragePreferences();
  const sectionParam = route.params?.section;

  const navigateToSection = useCallback(
    (section: NotificationSettingsSectionConfig) => {
      navigation.navigate(
        Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
        getNotificationSettingsSectionRouteParams(section),
      );
    },
    [navigation],
  );

  useEffect(() => {
    if (!sectionParam) {
      return;
    }

    const section = resolveNotificationSettingsSection(sectionParam);
    if (!section) {
      navigation.setParams({ section: undefined });
      return;
    }

    if (!isMetamaskNotificationsEnabled) {
      return;
    }

    navigation.setParams({ section: undefined });
    navigateToSection(section);
  }, [
    isMetamaskNotificationsEnabled,
    navigateToSection,
    navigation,
    sectionParam,
  ]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <HeaderCompactStandard onBack={navigation.goBack} />
      <ScrollView style={styles.container}>
        <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
          {strings('app_settings.notifications_title')}
        </Text>
        <MainNotificationToggle />

        {isMetamaskNotificationsEnabled &&
          NOTIFICATION_SETTINGS_SECTIONS.map((section) => {
            if (
              section.requiresSocialLeaderboard &&
              !isSocialLeaderboardEnabled
            ) {
              return null;
            }

            return (
              <NotificationRow
                key={section.type}
                title={strings(section.titleKey)}
                status={
                  section.showStatus
                    ? getStatusText(preferences?.[section.type])
                    : undefined
                }
                iconName={section.iconName}
                onPress={() => navigateToSection(section)}
              />
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsSettings;
