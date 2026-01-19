/* eslint-disable react/display-name */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

import { useStyles } from '../../../../component-library/hooks';
import SwitchLoadingModal from '../../../UI/Notification/SwitchLoadingModal';
import { AccountsList } from './AccountsList';
import { Props } from './NotificationsSettings.types';

import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';

import Routes from '../../../../constants/navigation/Routes';

import HeaderCenter from '../../../../component-library/components-temp/HeaderCenter';
import { useSwitchNotificationLoadingText } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { FeatureAnnouncementToggle } from './FeatureAnnouncementToggle';
import { MainNotificationToggle } from './MainNotificationToggle';
import styleSheet from './NotificationsSettings.styles';
import { ResetNotificationsButton } from './ResetNotificationsButton';
import SessionHeader from './sectionHeader';
import { PushNotificationToggle } from './PushNotificationToggle';
import { useFirstHDWalletAccounts } from './AccountsList.hooks';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';

const NotificationsSettings = ({ navigation }: Props) => {
  const theme = useTheme();

  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const firstHDWallet = useFirstHDWalletAccounts();
  const hasFirstHDWallet = Boolean(
    firstHDWallet?.data && firstHDWallet?.data.length > 0,
  );

  const loadingText = useSwitchNotificationLoadingText();

  // Style
  const { styles } = useStyles(styleSheet, { theme });

  return (
    <View style={styles.wrapper}>
      <HeaderCenter
        title={strings('app_settings.notifications_title')}
        onBack={() =>
          !isMetamaskNotificationsEnabled
            ? navigation.navigate(Routes.WALLET.HOME)
            : navigation.goBack()
        }
        includesTopInset
      />
      <ScrollView style={styles.container}>
      {/* Main Toggle */}
      <MainNotificationToggle />

      {/* Additional Toggles only visible if main toggle is enabled */}
      {isMetamaskNotificationsEnabled && (
        <>
          {/* Push Notifications Toggle */}
          <PushNotificationToggle />

          <View style={styles.line} />

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
          <View style={styles.productAnnouncementContainer}>
            <FeatureAnnouncementToggle />
          </View>

          <View
            style={styles.line}
            testID={
              NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENT_SEPARATOR
            }
          />

          {/* Account Notification Toggles */}
          {hasFirstHDWallet && (
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
              <AccountsList />
            </>
          )}

          {/* Reset Notifications Button */}
          <ResetNotificationsButton />
        </>
      )}
      <SwitchLoadingModal
        loading={!!loadingText}
        loadingText={loadingText ?? ''}
      />
    </ScrollView>
    </View>
  );
};

export default NotificationsSettings;

NotificationsSettings.navigationOptions = {
  headerShown: false,
};
