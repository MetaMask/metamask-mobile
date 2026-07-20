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
import {
  useNotificationStoragePreferences,
  type NotificationPreferenceSection,
} from './hooks/useNotificationStoragePreferences';

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
        <Icon
          name={iconName}
          color={IconColor.IconAlternative}
          size={IconSize.Lg}
        />
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

  const navigateToSection = (
    type: NotificationPreferenceSection,
    title: string,
    description: string,
  ) => {
    navigation.navigate(Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION, {
      type,
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

        {isMetamaskNotificationsEnabled && (
          <>
            <NotificationRow
              title={strings(
                'app_settings.notifications_opts.wallet_activity_title',
              )}
              status={getStatusText(preferences?.walletActivity)}
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
                )
              }
            />

            <NotificationRow
              title={strings('app_settings.notifications_opts.perps_title')}
              status={getStatusText(preferences?.perps)}
              iconName={IconName.Candlestick}
              onPress={() =>
                navigateToSection(
                  'perps',
                  strings('app_settings.notifications_opts.perps_title'),
                  strings('app_settings.notifications_opts.perps_desc'),
                )
              }
            />

            <NotificationRow
              title={strings(
                'app_settings.notifications_opts.agentic_cli_title',
              )}
              status={getStatusText(preferences?.agenticCli)}
              iconName={IconName.Code}
              onPress={() =>
                navigateToSection(
                  'agenticCli',
                  strings('app_settings.notifications_opts.agentic_cli_title'),
                  strings('app_settings.notifications_opts.agentic_cli_desc'),
                )
              }
            />

            {isSocialLeaderboardEnabled && (
              <NotificationRow
                title={strings(
                  'app_settings.notifications_opts.social_ai_title',
                )}
                status={getStatusText(preferences?.socialAI)}
                iconName={IconName.Flash}
                onPress={() =>
                  navigateToSection(
                    'socialAI',
                    strings('app_settings.notifications_opts.social_ai_title'),
                    strings('app_settings.notifications_opts.social_ai_desc'),
                  )
                }
              />
            )}

            <NotificationRow
              title={strings('app_settings.notifications_opts.marketing_title')}
              status={getStatusText(preferences?.marketing)}
              iconName={IconName.Campaign}
              onPress={() =>
                navigateToSection(
                  'marketing',
                  strings('app_settings.notifications_opts.marketing_title'),
                  strings('app_settings.notifications_opts.marketing_desc'),
                )
              }
            />

            {isPriceAlertsEnabled && (
              <NotificationRow
                title={strings(
                  'app_settings.notifications_opts.price_alerts_title',
                )}
                status={getStatusText(preferences?.priceAlerts)}
                iconName={IconName.Notification}
                onPress={() =>
                  navigateToSection(
                    'priceAlerts',
                    strings(
                      'app_settings.notifications_opts.price_alerts_title',
                    ),
                    strings(
                      'app_settings.notifications_opts.price_alerts_desc',
                    ),
                  )
                }
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsSettings;
