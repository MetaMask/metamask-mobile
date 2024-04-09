import React from 'react';
import { Image, View } from 'react-native';

import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

import { Notification } from '../types-old';

import FCMPlaceholder from '../../../../images/drawer-bg.png';

// eslint-disable-next-line react-hooks/rules-of-hooks
const renderFCMDetails = (notification: Notification, styles: any) => (
  <View style={styles.renderFCMContainer}>
    <View style={styles.renderFCMCard}>
      {/* <Image source={{ uri: notification.imageUri }} /> */}
      <Image source={FCMPlaceholder} style={styles.FCMImage} />
    </View>
    {notification.title && (
      <Text variant={TextVariant.BodyLGMedium}>{notification.title}</Text>
    )}

    <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
      {notification.message}
    </Text>

    {notification?.cta && (
      <Button
        variant={ButtonVariants.Secondary}
        label={notification.cta.label}
        onPress={notification.cta.onPress}
        style={styles.ctaBtn}
        endIconName={notification.cta.icon}
      />
    )}
  </View>
);

export default renderFCMDetails;
