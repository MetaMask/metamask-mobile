/* eslint-disable react/display-name */
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

import { useStyles } from '../../../../component-library/hooks';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import SwitchLoadingModal from '../../../UI/Notification/SwitchLoadingModal';
import { AccountsList } from './AccountsList';
import { Props } from './NotificationsSettings.types';

import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';

import Routes from '../../../../constants/navigation/Routes';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';

import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useSwitchNotificationLoadingText } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { FeatureAnnouncementToggle } from './FeatureAnnouncementToggle';
import { MainNotificationToggle } from './MainNotificationToggle';
import styleSheet, {
  styles as navigationOptionsStyles,
} from './NotificationsSettings.styles';
import { ResetNotificationsButton } from './ResetNotificationsButton';
import SessionHeader from './sectionHeader';
import { PushNotificationToggle } from './PushNotificationToggle';

const NotificationsSettings = ({ navigation, route }: Props) => {
  const theme = useTheme();

  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

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

NotificationsSettings.navigationOptions = ({
  navigation,
  isNotificationEnabled,
}: {
  navigation: NavigationProp<ParamListBase>;
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
      style={navigationOptionsStyles.headerLeft}
    />
  ),
});
