import React from 'react';
import { Linking } from 'react-native';
import { Button, ButtonVariant } from '@metamask/design-system-react-native';
import { ModalFooterAnnouncementCta } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import SharedDeeplinkManager from '../../../../../core/DeeplinkManager/DeeplinkManager';
import AppConstants from '../../../../../core/AppConstants';
import Logger from '../../../../../util/Logger';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { notificationAnalyticsProperties } from '../../../../../util/notifications/methods/notification-analytics';

type AnnouncementCtaFooterProps = ModalFooterAnnouncementCta;

export default function AnnouncementCtaFooter(
  props: AnnouncementCtaFooterProps,
) {
  const { styles } = useStyles();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const callEvent = (clickedItem: 'external_link' | 'internal_link') => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED)
        .addProperties({
          ...notificationAnalyticsProperties(props.notification),
          clicked_item: clickedItem,
        })
        .build(),
    );
  };

  const getLinkConfig = () => {
    if (props.externalLink) {
      const { externalLinkUrl, externalLinkText } = props.externalLink;
      return {
        label: externalLinkText,
        clickedItem: 'external_link' as const,
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
        clickedItem: 'internal_link' as const,
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
      variant={ButtonVariant.Primary}
      isFullWidth
      style={styles.ctaBtn}
      onPress={() => {
        callEvent(linkConfig.clickedItem);
        linkConfig.onPress();
      }}
    >
      {linkConfig.label}
    </Button>
  );
}
