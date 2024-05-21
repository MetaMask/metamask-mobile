import React, { useState } from 'react';
import { Image, View, Linking } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

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
import { CONSENSYS_PRIVACY_POLICY } from '../../../../constants/urls';
import { useSelector } from 'react-redux';
import { mmStorage } from '../../../../util/notifications';
import { STORAGE_IDS } from '../../../../util/notifications/settings/storage/constants';

const OptIn = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  const isNotificationEnabled = useSelector(
    (state: any) => state.notification?.notificationsSettings?.isEnabled,
  );
  const [promptCount, setPromptCount] = useState(0);

  const navigateToNotificationsSettings = () => {
    navigation.navigate(Routes.SETTINGS.NOTIFICATIONS);
  };

  const navigateToMainWallet = () => {
    !isNotificationEnabled &&
      mmStorage.saveLocal(
        STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
        promptCount,
      );
    navigation.navigate(Routes.WALLET_VIEW);
  };

  const goToLearnMore = () => {
    Linking.openURL(CONSENSYS_PRIVACY_POLICY);
  };

  useFocusEffect(() => {
    if (isNotificationEnabled) {
      navigateToMainWallet();
    } else {
      const count = mmStorage.getLocal(
        STORAGE_IDS.PUSH_NOTIFICATIONS_PROMPT_COUNT,
      );
      const times = count + 1 || 1;

      setPromptCount(times);
    }
  });

  return (
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
          onPress={navigateToNotificationsSettings}
          style={styles.ctaBtn}
        />
      </View>
    </View>
  );
};

export default OptIn;
