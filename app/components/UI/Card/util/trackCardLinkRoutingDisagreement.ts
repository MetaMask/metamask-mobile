import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import type { CardEntryRouting } from '../../../../core/Engine/controllers/card-controller/utils/cardLinks';

export type CardLinkRoutingEntryPoint =
  | 'card_welcome'
  | 'deeplink_card_home'
  | 'deeplink_card_onboarding';

export const trackCardLinkRoutingDisagreement = (
  routing: CardEntryRouting,
  entryPoint: CardLinkRoutingEntryPoint,
): void => {
  if (!routing.disagreesWithLegacy) return;
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.CARD_LINK_ROUTING_DISAGREEMENT,
    )
      .addProperties({
        entry_point: entryPoint,
        routed_by: routing.source,
        links_say_card: routing.source === 'card_links' && routing.hasCard,
        linked_provider: routing.provider,
      })
      .build(),
  );
};
