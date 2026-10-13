import type { TraderPositionPnlProps } from './TraderPositionPnl';

/**
 * TODO: Replace this fixture with the Social API position response.
 * This dev-only data keeps the ASSETS-4080 UI available until the API is ready.
 */
export const MOCK_TRADER_POSITION_PNL: Omit<
  TraderPositionPnlProps,
  'isExpanded' | 'onToggleExpanded'
> = {
  positionValue: '$103.33',
  pnl: {
    amount: '+$15.03',
    percentage: '+17.02%',
    isProfit: true,
  },
  expandedDetails: {
    averageCost: '$0.0357',
    realizedPnl: '+$8.42',
    unrealizedPnl: '+$15.03',
    holdTime: '12 days',
  },
};
