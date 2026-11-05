import { SocialLeaderboardEventProperties } from '../../../../components/Views/SocialLeaderboard/analytics/socialLeaderboardEvents';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';

/** The query string every Social notification deeplink carries. */
export interface SocialNotificationDeeplinkParams {
  positionId?: string;
  traderId?: string;
  deduplicationId?: string;
  notificationSubtype?: string;
  notificationTemplateVariant?: string;
}

export const parseSocialNotificationDeeplinkParams = (
  actionPath: string,
): SocialNotificationDeeplinkParams => {
  const urlParams = new URLSearchParams(
    actionPath.includes('?') ? actionPath.split('?')[1] : '',
  );

  return {
    positionId: urlParams.get('positionId')?.trim() || undefined,
    traderId: urlParams.get('traderId')?.trim() || undefined,
    deduplicationId: urlParams.get('deduplication_id')?.trim() || undefined,
    notificationSubtype:
      urlParams.get('notification_subtype')?.trim() || undefined,
    notificationTemplateVariant:
      urlParams.get('notification_template_variant')?.trim() || undefined,
  };
};

/**
 * Only a link that carries a subtype came from a notification; a shared or
 * hand-typed one is left unattributed.
 */
export const trackSocialNotificationClick = ({
  notificationSubtype,
  notificationTemplateVariant,
}: Pick<
  SocialNotificationDeeplinkParams,
  'notificationSubtype' | 'notificationTemplateVariant'
>): void => {
  if (notificationSubtype === undefined) {
    return;
  }

  const event = AnalyticsEventBuilder.createEventBuilder(
    MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_NOTIFICATION_CLICKED,
  )
    .addProperties({
      [SocialLeaderboardEventProperties.NOTIFICATION_SUBTYPE]:
        notificationSubtype,
      ...(notificationTemplateVariant !== undefined && {
        [SocialLeaderboardEventProperties.NOTIFICATION_TEMPLATE_VARIANT]:
          notificationTemplateVariant,
      }),
    })
    .build();
  analytics.trackEvent(event);
};
