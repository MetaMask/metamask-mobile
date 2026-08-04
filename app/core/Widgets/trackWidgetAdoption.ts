import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { UserProfileProperty } from '../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Logger from '../../util/Logger';
import { getInstalledWidgets } from './getInstalledWidgets';

/**
 * Reports widget adoption: one event (an adoption time series, segmentable
 * by widget kind/family) plus two user traits (so any other event can be
 * segmented by widget usage). Measures installs — whether the user has
 * actually placed a widget — rather than taps, since a passive balance
 * widget is glanced at, not tapped; see docs/widgets/README.md's "Adoption
 * analytics" section for the full rationale.
 *
 * Called fire-and-forget, once per app launch, from
 * `WidgetUpdaterService.initialize()`, which already gates this to iOS and
 * to `MM_WIDGETS_ENABLED === 'true'`. The analytics queue handles opt-in
 * internally, so no consent check is needed here. Never throws.
 */
export async function trackWidgetAdoption(): Promise<void> {
  try {
    const widgets = await getInstalledWidgets();

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WIDGETS_ADOPTION,
      )
        .addProperties({
          widget_count: widgets.length,
          widget_kinds: [...new Set(widgets.map((widget) => widget.kind))],
          widget_families: [...new Set(widgets.map((widget) => widget.family))],
        })
        .build(),
    );

    analytics.identify({
      [UserProfileProperty.HAS_WIDGETS_INSTALLED]: widgets.length > 0,
      [UserProfileProperty.WIDGETS_INSTALLED_COUNT]: widgets.length,
    });
  } catch (error) {
    Logger.error(
      error as Error,
      'Error tracking widget adoption - analytics tracking failed',
    );
  }
}
