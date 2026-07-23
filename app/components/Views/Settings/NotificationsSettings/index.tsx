import React from 'react';
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
import { selectPriceAlertsEnabled } from '../../../../selectors/featureFlagController/priceAlerts';

import Routes from '../../../../constants/navigation/Routes';

import { MainNotificationToggle } from './MainNotificationToggle';
import styleSheet from './NotificationsSettings.styles';
import { useNotificationStoragePreferences } from './hooks/useNotificationStoragePreferences';
import {
  getCategoryDescription,
  getCategoryTitle,
  getNotificationsSettingsSectionConfigs,
  isChannelEnabledForAusKeys,
  useNotificationCategories,
} from '../../../../util/notifications/categories';
import NotificationsSettingsRowSkeleton from './NotificationsSettingsRowSkeleton';

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
import { NotificationPreferences } from '@metamask/authenticated-user-storage';

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

const getStatusText = (pushEnabled: boolean, inAppEnabled: boolean) => {
  const active = [];
  if (pushEnabled) {
    active.push(strings('app_settings.notifications_opts.status_push'));
  }
  if (inAppEnabled) {
    active.push(strings('app_settings.notifications_opts.status_in_app'));
  }
  return active.length > 0
    ? active.join(', ')
    : strings('app_settings.notifications_opts.status_off');
};

const NotificationsSettings = ({ navigation }: Props) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const isPriceAlertsEnabled = useSelector(selectPriceAlertsEnabled);

  const { preferences } = useNotificationStoragePreferences();
  const { categories, isLoading: isLoadingCategories } =
    useNotificationCategories();
  const sections = getNotificationsSettingsSectionConfigs(categories, {
    isSocialLeaderboardEnabled,
    isPriceAlertsEnabled,
  });

  const navigateToSection = (
    categoryId: string,
    ausKeys: string[],
    title: string,
    description: string,
  ) => {
    navigation.navigate(Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION, {
      categoryId,
      ausKeys,
      title,
      description,
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

        {isMetamaskNotificationsEnabled && isLoadingCategories && (
          <NotificationsSettingsRowSkeleton />
        )}

        {isMetamaskNotificationsEnabled &&
          !isLoadingCategories &&
          sections.map((section) => {
            const title = getCategoryTitle(section.categoryId);
            const description = getCategoryDescription(section.categoryId);
            const preferencesRecord = preferences as
              | NotificationPreferences
              | null
              | undefined;

            return (
              <NotificationRow
                key={section.categoryId}
                title={title}
                status={getStatusText(
                  isChannelEnabledForAusKeys(
                    preferencesRecord,
                    section.ausKeys,
                    'pushNotificationsEnabled',
                  ),
                  isChannelEnabledForAusKeys(
                    preferencesRecord,
                    section.ausKeys,
                    'inAppNotificationsEnabled',
                  ),
                )}
                iconName={IconName[section.icon as keyof typeof IconName]}
                onPress={() =>
                  navigateToSection(
                    section.categoryId,
                    section.ausKeys,
                    title,
                    description,
                  )
                }
              />
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsSettings;
