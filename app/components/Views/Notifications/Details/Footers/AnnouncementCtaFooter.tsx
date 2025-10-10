import React, { useCallback } from 'react';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { ModalFooterAnnouncementCta } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import SharedDeeplinkManager from '../../../../../core/DeeplinkManager/SharedDeeplinkManager';
import AppConstants from '../../../../../core/AppConstants';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

type AnnouncementCtaFooterProps = ModalFooterAnnouncementCta;

export default function AnnouncementCtaFooter(
  props: AnnouncementCtaFooterProps,
) {
  const { styles } = useStyles();
  const { trackEvent, createEventBuilder } = useMetrics();

  const handlePress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED)
        .addProperties({
          notification_id: props.notification.id,
          notification_type: props.notification.type,
          clicked_item: 'cta_button',
        })
        .build(),
    );

    if (props.mobileLink?.mobileLinkUrl) {
      SharedDeeplinkManager.parse(props.mobileLink?.mobileLinkUrl, {
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      });
    }
  }, [
    createEventBuilder,
    props.mobileLink?.mobileLinkUrl,
    props.notification.id,
    props.notification.type,
    trackEvent,
  ]);

  if (!props.mobileLink) {
    return null;
  }

  // Mobile links are URLS. We can utilise deeplinks for specific behaviour
  // either normal URL to leave app, or deeplinks to open in-app browser or other functionality.
  const { mobileLinkText } = props.mobileLink;

  return (
    <Button
      variant={ButtonVariants.Primary}
      width={ButtonWidthTypes.Full}
      label={mobileLinkText}
      style={styles.ctaBtn}
      onPress={handlePress}
    />
  );
}
