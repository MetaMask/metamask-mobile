export const EventMarketPeriodChipsTestIds = {
  LIST: 'predict-next-event-market-period-chips',
  FADE: (edge: 'start' | 'end') =>
    `predict-next-event-market-period-chips-fade-${edge}`,
  CHIP: (key: string) => `predict-next-event-market-period-chip-${key}`,
} as const;
