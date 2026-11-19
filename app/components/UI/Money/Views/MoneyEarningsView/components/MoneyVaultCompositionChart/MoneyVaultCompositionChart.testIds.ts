export const MoneyVaultCompositionChartTestIds = {
  CHART: 'money-vault-composition-chart',
  RING: 'money-vault-composition-chart-ring',
  CENTER_PERCENTAGE: 'money-vault-composition-chart-center-percentage',
  CENTER_LABEL: 'money-vault-composition-chart-center-label',
  EMPTY: 'money-vault-composition-chart-empty',
  INVALID: 'money-vault-composition-chart-invalid',
  WEDGE: (componentKey: string): string =>
    `money-vault-composition-chart-wedge-${componentKey}`,
} as const;
