import React from 'react';
import { Linking } from 'react-native';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { ModalFooterAnnouncementCta } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import SharedDeeplinkManager from '../../../../../core/DeeplinkManager/DeeplinkManager';
import AppConstants from '../../../../../core/AppConstants';
import Logger from '../../../../../util/Logger';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

type AnnouncementCtaFooterProps = ModalFooterAnnouncementCta;

export default function AnnouncementCtaFooter(
  props: AnnouncementCtaFooterProps,
) {
  const { styles } = useStyles();
  const { trackEvent, createEventBuilder } = useMetrics();

  const callEvent = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED)
        .addProperties({
          notification_id: props.notification.id,
          notification_type: props.notification.type,
          clicked_item: 'cta_button',
        })
        .build(),
    );
  };

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
      onPress={() => {
        callEvent();
        linkConfig.onPress();
      }}
    />
  );
}
