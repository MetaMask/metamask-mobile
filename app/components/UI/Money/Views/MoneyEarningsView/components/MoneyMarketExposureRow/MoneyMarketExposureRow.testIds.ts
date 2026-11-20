export const MoneyMarketExposureRowTestIds = {
  ROW: (protocolKey: string): string =>
    `money-market-exposure-row-${protocolKey}`,
  LABEL: (protocolKey: string): string =>
    `money-market-exposure-row-label-${protocolKey}`,
  ALLOCATION: (protocolKey: string): string =>
    `money-market-exposure-row-allocation-${protocolKey}`,
  TRACK: (protocolKey: string): string =>
    `money-market-exposure-row-track-${protocolKey}`,
  FILL: (protocolKey: string): string =>
    `money-market-exposure-row-fill-${protocolKey}`,
} as const;
