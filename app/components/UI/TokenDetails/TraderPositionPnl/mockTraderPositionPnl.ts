import type { TraderPositionPnlProps } from './TraderPositionPnl';

/**
 * TODO: Replace this fixture with the Social API position response.
 * This dev-only data keeps the ASSETS-4080 UI available until the API is ready.
 */
export const MOCK_TRADER_POSITION_PNL: Omit<
  TraderPositionPnlProps,
  'isExpanded' | 'onToggleExpanded'
> = {
  positionValue: '$103.31',
  pnl: {
    amount: '+$15.01',
    percentage: '+16.99%',
    isProfit: true,
  },
};
