export const MoneyVaultCompositionMarketRowTestIds = {
  ROW: (componentKey: string): string =>
    `money-vault-composition-market-row-${componentKey}`,
  DOT: (componentKey: string): string =>
    `money-vault-composition-market-row-dot-${componentKey}`,
  PRIMARY_LABEL: (componentKey: string): string =>
    `money-vault-composition-market-row-primary-label-${componentKey}`,
  SECONDARY_LABEL: (componentKey: string): string =>
    `money-vault-composition-market-row-secondary-label-${componentKey}`,
  ALLOCATION: (componentKey: string): string =>
    `money-vault-composition-market-row-allocation-${componentKey}`,
  SUPPLY_APY: (componentKey: string): string =>
    `money-vault-composition-market-row-supply-apy-${componentKey}`,
  INCENTIVE_APR: (componentKey: string): string =>
    `money-vault-composition-market-row-incentive-apr-${componentKey}`,
} as const;
