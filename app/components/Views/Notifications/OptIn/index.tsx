import React, { Fragment } from 'react';
import { Image, View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useMetrics } from '../../../../components/hooks/useMetrics';
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
import AppConstants from '../../../../core/AppConstants';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import SwitchLoadingModal from '../../../../components/UI/Notification/SwitchLoadingModal';
import { useHandleOptInCancel, useHandleOptInClick } from './OptIn.hooks';

const OptIn = () => {
  const metrics = useMetrics();
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();

  const { enableNotifications, isEnablingNotifications } =
    useEnableNotifications({
      nudgeEnablePush: true,
    });

  const handleOptInCancel = useHandleOptInCancel({
    navigation,
    metrics,
    isCreatingNotifications: isEnablingNotifications,
  });

  const handleOptInClick = useHandleOptInClick({
    navigation,
    metrics,
    enableNotifications,
  });

  const goToLearnMore = () => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  };

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
            onPress={handleOptInCancel}
            style={styles.ctaBtn}
          />
          <Button
            variant={ButtonVariants.Primary}
            label={strings('notifications.activation_card.cta')}
            onPress={handleOptInClick}
            style={styles.ctaBtn}
          />
        </View>
      </View>
      <SwitchLoadingModal
        loading={isEnablingNotifications}
        loadingText={strings('app_settings.enabling_notifications')}
      />
    </Fragment>
  );
};

export default OptIn;
