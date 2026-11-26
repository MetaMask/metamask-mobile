export const MoneyEarningsViewTestIds = {
  CONTAINER: 'money-earnings-view-container',
  EARNINGS_PANEL: 'money-earnings-view-panel-earnings',
  ALLOCATION_PANEL: 'money-earnings-view-panel-allocation',
  BACK_BUTTON: 'money-earnings-view-back-button',
  TAB_EARNINGS: 'money-earnings-view-tab-earnings',
  TAB_APY: 'money-earnings-view-tab-apy',
  TAB_ALLOCATION: 'money-earnings-view-tab-allocation',
  HERO: 'money-earnings-view-hero',
  HERO_TOTAL: 'money-earnings-view-hero-total',
  HERO_PERIOD_DATE: 'money-earnings-view-hero-period-date',
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
  ALLOCATION_LOADING: 'money-earnings-view-allocation-loading',
  ALLOCATION_ERROR: 'money-earnings-view-allocation-error',
  ALLOCATION_EMPTY: 'money-earnings-view-allocation-empty',
  ALLOCATION_DEGRADED: 'money-earnings-view-allocation-degraded',
  ALLOCATION_DETAILS_DIVIDER: 'money-earnings-view-allocation-details-divider',
  ALLOCATION_RISKS_DIVIDER: 'money-earnings-view-allocation-risks-divider',
  SUMMARY: 'money-earnings-view-summary',
  SUMMARY_ROW: (index: number): string =>
    `money-earnings-view-summary-row-${index}`,
  SUMMARY_ROW_DATE: (index: number): string =>
    `money-earnings-view-summary-row-date-${index}`,
  SUMMARY_ROW_VALUE: (index: number): string =>
    `money-earnings-view-summary-row-value-${index}`,
  SUMMARY_NOTE: 'money-earnings-view-summary-note',
  ADD_BUTTON: 'money-earnings-view-add-button',
  LOADING: 'money-earnings-view-loading',
  ERROR: 'money-earnings-view-error',
  EMPTY: 'money-earnings-view-empty',
} as const;
