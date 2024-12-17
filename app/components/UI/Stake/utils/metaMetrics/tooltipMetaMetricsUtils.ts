import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';

export const getTooltipMetricProperties = (
  location: string,
  tooltipName: string,
) => ({
  selected_provider: 'consensys',
  text: 'Tooltip Opened',
  location,
  tooltip_name: tooltipName,
});

export const createTooltipOpenedEvent = (
  location: string,
  tooltipName: string,
) => {
  const createEventBuilder = MetricsEventBuilder.createEventBuilder;

  return createEventBuilder(MetaMetricsEvents.TOOLTIP_OPENED)
    .addProperties(getTooltipMetricProperties(location, tooltipName))
    .build();
};
