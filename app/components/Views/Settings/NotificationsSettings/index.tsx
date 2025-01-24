/* eslint-disable react/display-name */
import React, { useEffect, useCallback } from 'react';
import { ScrollView, Switch, View, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

import { RootState } from '../../../../reducers';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { AccountsList } from './AccountsList';
import { useAccounts } from '../../../../components/hooks/useAccounts';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import SwitchLoadingModal from '../../../UI/Notification/SwitchLoadingModal';
import { Props } from './NotificationsSettings.types';
import { useStyles } from '../../../../component-library/hooks';

import CustomNotificationsRow from './CustomNotificationsRow';
import {
  selectIsFeatureAnnouncementsEnabled,
  selectIsMetamaskNotificationsEnabled,
  selectIsUpdatingMetamaskNotificationsAccount,
} from '../../../../selectors/notifications';
import { selectIsProfileSyncingEnabled } from '../../../../selectors/identity';

import Routes from '../../../../constants/navigation/Routes';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';

import SessionHeader from './sectionHeader';
import {
  useDisableNotifications,
  useEnableNotifications,
} from '../../../../util/notifications/hooks/useNotifications';
import {
  useAccountSettingsProps,
  useSwitchNotifications,
} from '../../../../util/notifications/hooks/useSwitchNotifications';
import styleSheet, {
  styles as navigationOptionsStyles,
} from './NotificationsSettings.styles';
import AppConstants from '../../../../core/AppConstants';
import notificationsRows from './notificationsRows';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { useToggleNotifications } from './useToggleNotifications';

interface MainNotificationSettingsProps extends Props {
  toggleNotificationsEnabled: () => void;
  isMetamaskNotificationsEnabled: boolean;
  goToLearnMore: () => void;
  styles: ReturnType<typeof styleSheet>;
}
const MainNotificationSettings = ({
  styles,
  toggleNotificationsEnabled,
  isMetamaskNotificationsEnabled,
  goToLearnMore,
}: MainNotificationSettingsProps) => {
  const { colors, brandColors } = useTheme();

  return (
    <>
      <View style={styles.switchElement}>
        <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.allow_notifications')}
        </Text>
        <Switch
          value={isMetamaskNotificationsEnabled}
          onChange={toggleNotificationsEnabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={brandColors.white}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
      <View style={styles.setting}>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {strings('app_settings.allow_notifications_desc')}{' '}
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Info}
            onPress={goToLearnMore}
          >
            {strings('notifications.activation_card.learn_more')}
          </Text>
        </Text>
      </View>
    </>
  );
};
const NotificationsSettings = ({ navigation, route }: Props) => {
  const { accounts } = useAccounts();
  const { trackEvent, createEventBuilder } = useMetrics();
  const theme = useTheme();

  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isFeatureAnnouncementsEnabled = useSelector(
    selectIsFeatureAnnouncementsEnabled,
  );

  const isUpdatingMetamaskNotificationsAccount = useSelector(
    selectIsUpdatingMetamaskNotificationsAccount,
  );

  const {
    enableNotifications,
    loading: enableLoading,
    error: enablingError,
  } = useEnableNotifications();

  const {
    disableNotifications,
    loading: disableLoading,
    error: disablingError,
  } = useDisableNotifications();

  const { switchFeatureAnnouncements } = useSwitchNotifications();
  const { updateAndfetchAccountSettings } = useAccountSettingsProps(accounts);

  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );
  const [uiNotificationStatus, setUiNotificationStatus] = React.useState(false);
  const [platformAnnouncementsState, setPlatformAnnouncementsState] =
    React.useState(isFeatureAnnouncementsEnabled);
  const accountSettingsData = useSelector(
    (state: RootState) => state.notifications,
  );
  const loading = enableLoading || disableLoading;
  const errorText = enablingError || disablingError;
  const loadingText = !uiNotificationStatus
    ? strings('app_settings.disabling_notifications')
    : strings('app_settings.enabling_notifications');

  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);

  // Params
  const isFullScreenModal = route?.params?.isFullScreenModal;
  // Style
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, { theme });

  /**
   * Initializes the notifications feature.
   * If the notifications are disabled and the basic functionality is enabled,
   * it will request the push notifications permission and enable the notifications
   * if the permission is granted.
   */
  const { toggleNotificationsEnabled } = useToggleNotifications({
    navigation,
    basicFunctionalityEnabled,
    isMetamaskNotificationsEnabled,
    isProfileSyncingEnabled,
    disableNotifications,
    enableNotifications,
    setUiNotificationStatus,
  });

  const toggleCustomNotificationsEnabled = useCallback(async () => {
    setPlatformAnnouncementsState(!platformAnnouncementsState);
    await switchFeatureAnnouncements(!platformAnnouncementsState);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: 'product_announcements',
          old_value: platformAnnouncementsState,
          new_value: !platformAnnouncementsState,
        })
        .build(),
    );
  }, [
    platformAnnouncementsState,
    switchFeatureAnnouncements,
    trackEvent,
    createEventBuilder,
  ]);

  const goToLearnMore = () => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  };

  const onPressResetNotifications = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.RESET_NOTIFICATIONS,
    });
  }, [navigation]);

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

  const renderResetNotificationsBtn = useCallback(
    () => (
      <Button
        variant={ButtonVariants.Primary}
        label={strings('app_settings.reset_notifications')}
        size={ButtonSize.Md}
        onPress={onPressResetNotifications}
        style={styles.button}
      />
    ),
    [onPressResetNotifications, styles.button],
  );

  return (
    <ScrollView style={styles.wrapper}>
      <MainNotificationSettings
        styles={styles}
        toggleNotificationsEnabled={toggleNotificationsEnabled}
        isMetamaskNotificationsEnabled={isMetamaskNotificationsEnabled}
        goToLearnMore={goToLearnMore}
        navigation={navigation}
        route={route}
      />

      {isMetamaskNotificationsEnabled && (
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
          <CustomNotificationsRow
            title={notificationsRows[4].title}
            icon={notificationsRows[4].icon}
            isEnabled={platformAnnouncementsState}
            toggleCustomNotificationsEnabled={toggleCustomNotificationsEnabled}
          />
          <SessionHeader
            title={strings(
              'app_settings.notifications_opts.account_session_title',
            )}
            description={strings(
              'app_settings.notifications_opts.account_session_desc',
            )}
            styles={styles}
          />

          <AccountsList
            accounts={accounts}
            accountAvatarType={accountAvatarType}
            accountSettingsData={accountSettingsData}
            updateAndfetchAccountSettings={updateAndfetchAccountSettings}
            isUpdatingMetamaskNotificationsAccount={
              isUpdatingMetamaskNotificationsAccount
            }
          />
          {renderResetNotificationsBtn()}
        </>
      )}
      <SwitchLoadingModal
        loading={loading}
        loadingText={loadingText}
        error={errorText}
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
