import React, { Fragment, useCallback, useEffect } from 'react';
import { Image, View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useMetrics } from '../../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import EnableNotificationsCardPlaceholder from '../../../../images/enableNotificationsCard.png';
import { createStyles } from './styles';
import Routes from '../../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import AppConstants from '../../../../core/AppConstants';
import { RootState } from '../../../../reducers';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import SwitchLoadingModal from '../../../../components/UI/Notification/SwitchLoadingModal';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import { selectIsProfileSyncingEnabled } from '../../../../selectors/identity';

const OptIn = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();

  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  const isDeviceNotificationEnabled = useSelector(
    (state: RootState) => state.settings.deviceNotificationEnabled,
  );
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const { enableNotifications } = useEnableNotifications();
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);

  const [optimisticLoading, setOptimisticLoading] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const [enableManuallyNotification, setEnableManuallyNotification] =
    React.useState(false);
  const navigateToMainWallet = () => {
    if (!isUpdating) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_ACTIVATED)
          .addProperties({
            action_type: 'dismissed',
            is_profile_syncing_enabled: isProfileSyncingEnabled,
          })
          .build(),
      );
    }
    navigation.navigate(Routes.WALLET_VIEW);
  };

  const toggleNotificationsEnabled = useCallback(async () => {
    setEnableManuallyNotification(true);
    if (!basicFunctionalityEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BASIC_FUNCTIONALITY,
        params: {
          caller: Routes.NOTIFICATIONS.OPT_IN,
        },
      });
    } else {
      const { permission } = await NotificationsService.getAllPermissions();

      if (permission !== 'authorized') {
        return;
      }
      /**
       * Although this is an async function, we are dispatching an action (firing & forget)
       * to emulate optimistic UI.
       * Setting a standard timeout to emulate loading state
       * for 5 seconds. This only happens during the first time the user
       * optIn to notifications.
       */
      enableNotifications();
      setOptimisticLoading(true);
      setTimeout(() => {
        setOptimisticLoading(false);
        navigation.navigate(Routes.NOTIFICATIONS.VIEW);
      }, 5000);
    }
    setIsUpdating(true);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_ACTIVATED)
        .addProperties({
          action_type: 'activated',
          is_profile_syncing_enabled: isProfileSyncingEnabled,
        })
        .build(),
    );
  }, [
    basicFunctionalityEnabled,
    enableNotifications,
    navigation,
    isProfileSyncingEnabled,
    trackEvent,
    setIsUpdating,
    createEventBuilder,
  ]);

  const goToLearnMore = () => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  };

  useEffect(() => {
    if (
      isDeviceNotificationEnabled &&
      !isNotificationEnabled &&
      enableManuallyNotification
    ) {
      toggleNotificationsEnabled();
    }
  }, [
    enableManuallyNotification,
    isDeviceNotificationEnabled,
    isNotificationEnabled,
    toggleNotificationsEnabled,
  ]);

  return (
    <Fragment>
      <View style={styles.wrapper}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.textTitle}
        >
          {strings('notifications.activation_card.title')}
        </Text>
        <View style={styles.card}>
          <Image
            source={EnableNotificationsCardPlaceholder}
            style={styles.image}
          />
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.textSpace}
        >
          {strings('notifications.activation_card.description_1')}
        </Text>

        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.textSpace}
        >
          {strings('notifications.activation_card.description_2')}{' '}
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Info}
            onPress={goToLearnMore}
          >
            {strings('notifications.activation_card.learn_more')}
          </Text>
        </Text>

        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('notifications.activation_card.manage_preferences_1')}
          <Text variant={TextVariant.BodyMDBold} color={TextColor.Alternative}>
            {strings('notifications.activation_card.manage_preferences_2')}
          </Text>
        </Text>

        <View style={styles.btnContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('notifications.activation_card.cancel')}
            onPress={navigateToMainWallet}
            style={styles.ctaBtn}
          />
          <Button
            variant={ButtonVariants.Primary}
            label={strings('notifications.activation_card.cta')}
            onPress={toggleNotificationsEnabled}
            style={styles.ctaBtn}
          />
        </View>
      </View>
      <SwitchLoadingModal
        loading={optimisticLoading}
        loadingText={strings('app_settings.enabling_notifications')}
      />
    </Fragment>
  );
};

export default OptIn;
