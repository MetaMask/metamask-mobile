import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { EVENT_PROVIDERS } from '../../constants/events';

export const getTooltipMetricProperties = (
  location: string,
  tooltipName: string,
) => ({
  selected_provider: EVENT_PROVIDERS.CONSENSYS,
  text: 'Tooltip Opened',
  location,
  tooltip_name: tooltipName,
});

export const createTooltipOpenedEvent = (
  location: string,
  tooltipName: string,
) => {
  const createEventBuilder = AnalyticsEventBuilder.createEventBuilder;

  return createEventBuilder(MetaMetricsEvents.TOOLTIP_OPENED)
    .addProperties(getTooltipMetricProperties(location, tooltipName))
    .build();
};
