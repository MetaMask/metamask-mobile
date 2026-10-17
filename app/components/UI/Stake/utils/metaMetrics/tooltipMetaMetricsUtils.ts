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
