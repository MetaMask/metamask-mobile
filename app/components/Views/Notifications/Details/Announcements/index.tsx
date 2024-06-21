import React from 'react';
import { Image, View } from 'react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';

import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import { FeatureAnnouncementRawNotification } from '../../../../../util/notifications';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { TypeLinkFields } from '../../../../../util/notifications/types/featureAnnouncement/TypeLink';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const PLACEHOLDER_IMG_URI = require('../../../../../images/no-image-placeholder.jpeg');

interface Props {
  notification: FeatureAnnouncementRawNotification;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
  navigation: NavigationProp<ParamListBase>;
}

const AnnouncementsDetails: React.FC<Props> = ({
  notification,
  styles,
  navigation,
}: Props) => {
  const handleCTAPress = () => {
    // TODO: Currently handling CTAs with external links only. For now, we aren't handling deeplinks.
    const { link } = notification.data as unknown as {
      link: TypeLinkFields['fields'];
    };
    if (!link) return;
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: link.linkUrl,
      },
    });
  };

  const IMAGE_URI = notification.data.image?.file?.url || PLACEHOLDER_IMG_URI;
  return (
    <View style={styles.renderContainer}>
      <View style={styles.renderFCMCard}>
        <Image source={{ uri: IMAGE_URI }} style={styles.FCMImage} />
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
            (
              notification.data?.link as unknown as {
                linkText: TypeLinkFields['fields']['linkText'];
              }
            )?.linkText
            // TODO: Handle CTAs with external links only. For now, we aren't handleing deeplinks.
            // (notification.data?.action as { actionText?: string })?.actionText
          }
          onPress={handleCTAPress}
          style={styles.ctaBtn}
          endIconName={IconName.Arrow2Right}
        />
      )}
    </View>
  );
};

export default AnnouncementsDetails;
