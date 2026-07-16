import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import { SocialLeaderboardEventProperties } from '../../../../components/Views/SocialLeaderboard/analytics/socialLeaderboardEvents';

/**
 * Analytics SHARED across social notification deeplink opens.
 *
 * Only the properties present on EVERY social notification belong here — the
 * NAAP `notification_subtype` (required) and the A/B `notification_template_variant`
 * (optional). Notification-specific or dynamic properties (e.g. campaign fields
 * product/marketing want on some notifications but not others) should NOT be
 * bolted on as more optional params here; give them their own builder/getter and
 * merge at the call site, so this stays a small, stable, shared contract.
 */

type SocialNotificationClickEvent = Parameters<
  typeof AnalyticsEventBuilder.createEventBuilder
>[0];

export interface SocialNotificationTrackingParams {
  notificationSubtype?: string;
  notificationTemplateVariant?: string;
}

/**
 * Emits a "<feature> Notification Clicked" event for a notification-sourced
 * deeplink open. Shared by the follow-trade and weekly-leaderboard handlers so
 * the subtype/template-variant property contract stays identical across both.
 * No-ops for non-notification opens (no subtype).
 */
export const trackSocialNotificationClicked = (
  event: SocialNotificationClickEvent,
  {
    notificationSubtype,
    notificationTemplateVariant,
  }: SocialNotificationTrackingParams,
): void => {
  if (notificationSubtype === undefined) {
    return;
  }

  const builtEvent = AnalyticsEventBuilder.createEventBuilder(event)
    .addProperties({
      [SocialLeaderboardEventProperties.NOTIFICATION_SUBTYPE]:
        notificationSubtype,
      ...(notificationTemplateVariant !== undefined && {
        [SocialLeaderboardEventProperties.NOTIFICATION_TEMPLATE_VARIANT]:
          notificationTemplateVariant,
      }),
    })
    .build();
  analytics.trackEvent(builtEvent);
};
