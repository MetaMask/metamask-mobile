import React from 'react';
import { Image, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

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

const NotificationsOptIn = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();

  const navigateToNotificationSettings = () => {
    navigation.navigate('NotificationsSettings');
  };

  const navigateToMainWallet = () => {
    navigation.navigate('Wallet');
  };

  const goToLearnMore = () => {
    navigation.navigate('Webview', {
      screen: 'Webview',
      params: {
        //TODO: Update the URL to the correct one (ask the team for the correct URL)
        url: 'https://metamask.zendesk.com/hc/en-us/articles/360058630612',
      },
    });
  };

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
        {strings('notifications.activation_card.description_2')}
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
          onPress={navigateToNotificationSettings}
          style={styles.ctaBtn}
        />
      </View>
    </View>
  );
};

export default NotificationsOptIn;
