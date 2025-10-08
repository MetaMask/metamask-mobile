import React from 'react';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { ModalFooterAnnouncementCta } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import SharedDeeplinkManager from '../../../../../core/DeeplinkManager/SharedDeeplinkManager';
import AppConstants from '../../../../../core/AppConstants';

type AnnouncementCtaFooterProps = ModalFooterAnnouncementCta;

export default function AnnouncementCtaFooter(
  props: AnnouncementCtaFooterProps,
) {
  const { styles } = useStyles();

  if (!props.mobileLink) {
    return null;
  }

  // Mobile links are URLS. We can utilise deeplinks for specific behaviour
  // either normal URL to leave app, or deeplinks to open in-app browser or other functionality.
  const { mobileLinkUrl, mobileLinkText } = props.mobileLink;

  return (
    <Button
      variant={ButtonVariants.Primary}
      width={ButtonWidthTypes.Full}
      label={mobileLinkText}
      style={styles.ctaBtn}
      onPress={() =>
        SharedDeeplinkManager.parse(mobileLinkUrl, {
          origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        })
      }
    />
  );
}
