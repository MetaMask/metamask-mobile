export const PotentialEarningsTokenRowTestIds = {
  BALANCE: 'potential-earnings-token-row-balance',
  PROJECTED: 'potential-earnings-token-row-projected',
  NAME_ROW: 'potential-earnings-token-row-name-row',
  ROW: (symbol: string) => `potential-earnings-token-row-${symbol}`,
  BUTTON: (symbol: string) => `potential-earnings-token-row-${symbol}-button`,
} as const;
