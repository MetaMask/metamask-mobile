/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { Image, View } from 'react-native';

import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

import { FeatureAnnouncementRawNotification } from '../../../../util/notifications';
import { IconName } from 'app/component-library/components/Icons/Icon';

const renderFCMDetails = (
  notification: FeatureAnnouncementRawNotification,
  styles: Record<string, any>,
  navigation: any,
) => {
  const handleCTAPress = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url:
          // @ts-ignore
          notification.data?.link?.linkUrl ||
          // @ts-ignore
          notification.data?.action?.actionUrl,
      },
    });
  };

  return (
    <View style={styles.renderFCMContainer}>
      <View style={styles.renderFCMCard}>
        <Image
          source={{ uri: notification.data.image.file.url }}
          style={styles.FCMImage}
        />
      </View>
      {notification.data.title && (
        <Text variant={TextVariant.BodyLGMedium}>
          {notification.data.title}
        </Text>
      )}

      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {notification.data.longDescription}
      </Text>

      {(notification.data.link || notification.data.action) && (
        <Button
          variant={ButtonVariants.Secondary}
          label={
            (notification.data?.link as unknown as { linkText?: string })
              ?.linkText ||
            (notification.data?.action as { actionText?: string })?.actionText
          }
          onPress={handleCTAPress}
          style={styles.ctaBtn}
          endIconName={IconName.Arrow2Right}
        />
      )}
    </View>
  );
};

export default renderFCMDetails;
