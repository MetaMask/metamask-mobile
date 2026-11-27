export const MoneyEarningsViewTestIds = {
  CONTAINER: 'money-earnings-view-container',
  EARNINGS_PANEL: 'money-earnings-view-panel-earnings',
  BACK_BUTTON: 'money-earnings-view-back-button',
  TAB_EARNINGS: 'money-earnings-view-tab-earnings',
  TAB_APY: 'money-earnings-view-tab-apy',
  TAB_ALLOCATION: 'money-earnings-view-tab-allocation',
  HERO: 'money-earnings-view-hero',
  HERO_TOTAL: 'money-earnings-view-hero-total',
  HERO_TOTAL_SKELETON: 'money-earnings-view-hero-total-skeleton',
  HERO_PERIOD_DATE: 'money-earnings-view-hero-period-date',
  HERO_PERIOD_DATE_SKELETON: 'money-earnings-view-hero-period-date-skeleton',
  CHART: 'money-earnings-view-chart',
  CHART_PLOT: 'money-earnings-view-chart-plot',
  CHART_SLOT: (index: number): string =>
    `money-earnings-view-chart-slot-${index}`,
  CHART_FILL: (index: number): string =>
    `money-earnings-view-chart-fill-${index}`,
  CHART_X_LABEL: (index: number): string =>
    `money-earnings-view-chart-x-label-${index}`,
  CHART_Y_LABEL: (index: number): string =>
    `money-earnings-view-chart-y-label-${index}`,
  CHART_GRIDLINE: (index: number): string =>
    `money-earnings-view-chart-gridline-${index}`,
  RANGE_SELECTOR: 'money-earnings-view-range-selector',
  SUMMARY: 'money-earnings-view-summary',
  SUMMARY_ROW: (index: number): string =>
    `money-earnings-view-summary-row-${index}`,
  SUMMARY_ROW_DATE: (index: number): string =>
    `money-earnings-view-summary-row-date-${index}`,
  SUMMARY_ROW_VALUE: (index: number): string =>
    `money-earnings-view-summary-row-value-${index}`,
  SUMMARY_ROW_SKELETON: (index: number): string =>
    `money-earnings-view-summary-row-skeleton-${index}`,
  SUMMARY_NOTE: 'money-earnings-view-summary-note',
  ADD_BUTTON: 'money-earnings-view-add-button',
  LOADING: 'money-earnings-view-loading',
  ERROR: 'money-earnings-view-error',
  EMPTY: 'money-earnings-view-empty',
} as const;
