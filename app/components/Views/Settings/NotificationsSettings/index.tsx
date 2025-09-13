/* eslint-disable react/display-name */
import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import SwitchLoadingModal from '../../../UI/Notification/SwitchLoadingModal';
import { AccountsList } from './AccountsList';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import { useSwitchNotificationLoadingText } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { FeatureAnnouncementToggle } from './FeatureAnnouncementToggle';
import { MainNotificationToggle } from './MainNotificationToggle';
import { PerpsNotificationToggle } from './PerpsNotificationToggle';
import styleSheet from './NotificationsSettings.styles';
import { ResetNotificationsButton } from './ResetNotificationsButton';
import SessionHeader from './sectionHeader';
import { PushNotificationToggle } from './PushNotificationToggle';
import { selectPerpsEnabledFlag } from '../../../UI/Perps/selectors/featureFlags';
import { PERPS_NOTIFICATIONS_FEATURE_ENABLED } from '../../../UI/Perps/constants/perpsConfig';
import type { RootParamList } from '../../../../util/navigation';
import type { StackScreenProps } from '@react-navigation/stack';

type NotificationsSettingsProps = StackScreenProps<
  RootParamList,
  'NotificationsSettings'
>;

const NotificationsSettings = ({
  navigation,
  route,
}: NotificationsSettingsProps) => {
  const theme = useTheme();

  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  const loadingText = useSwitchNotificationLoadingText();

  // Params
  const isFullScreenModal = route?.params?.isFullScreenModal;
  // Style
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, { theme });

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

  return (
    <ScrollView style={styles.wrapper}>
      {/* Main Toggle */}
      <MainNotificationToggle />

      {/* Additional Toggles only visible if main toggle is enabled */}
      {isMetamaskNotificationsEnabled && (
        <>
          {/* Push Notifications Toggle */}
          <PushNotificationToggle />

          {/* Feature Announcement Toggle */}
          <SessionHeader
            title={strings(
              'app_settings.notifications_opts.customize_session_title',
            )}
            description={strings(
              'app_settings.notifications_opts.customize_session_desc',
            )}
            styles={styles}
          />
          <FeatureAnnouncementToggle />

          {isPerpsEnabled && PERPS_NOTIFICATIONS_FEATURE_ENABLED && (
            <PerpsNotificationToggle />
          )}

          {/* Account Notification Toggles */}
          <SessionHeader
            title={strings(
              'app_settings.notifications_opts.account_session_title',
            )}
            description={strings(
              'app_settings.notifications_opts.account_session_desc',
            )}
            styles={styles}
          />
          <AccountsList />

          {/* Reset Notifications Button */}
          <ResetNotificationsButton />
        </>
      )}
      <SwitchLoadingModal
        loading={!!loadingText}
        loadingText={loadingText ?? ''}
      />
    </ScrollView>
  );
};

export default NotificationsSettings;
