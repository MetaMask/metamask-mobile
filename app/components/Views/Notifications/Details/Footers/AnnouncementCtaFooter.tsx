import React from 'react';
import { Linking } from 'react-native';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { ModalFooterAnnouncementCta } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import SharedDeeplinkManager from '../../../../../core/DeeplinkManager/SharedDeeplinkManager';
import AppConstants from '../../../../../core/AppConstants';
import Logger from '../../../../../util/Logger';

type AnnouncementCtaFooterProps = ModalFooterAnnouncementCta;

export default function AnnouncementCtaFooter(
  props: AnnouncementCtaFooterProps,
) {
  const { styles } = useStyles();

  const getLinkConfig = () => {
    if (props.externalLink) {
      const { externalLinkUrl, externalLinkText } = props.externalLink;
      return {
        label: externalLinkText,
        onPress: () =>
          Linking.openURL(externalLinkUrl).catch((error) =>
            Logger.error(error as Error, 'Error opening external URL'),
          ),
      };
    }

    if (props.mobileLink) {
      const { mobileLinkUrl, mobileLinkText } = props.mobileLink;
      return {
        label: mobileLinkText,
        onPress: () =>
          SharedDeeplinkManager.parse(mobileLinkUrl, {
            origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
          }),
      };
    }

    return null;
  };

  const linkConfig = getLinkConfig();

  if (!linkConfig) {
    return null;
  }

  return (
    <Button
      variant={ButtonVariants.Primary}
      width={ButtonWidthTypes.Full}
      label={linkConfig.label}
      style={styles.ctaBtn}
      onPress={linkConfig.onPress}
    />
  );
}
