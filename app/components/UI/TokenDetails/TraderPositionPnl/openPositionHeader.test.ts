import {
  EM_DASH,
  formatTradeUnitPrice,
} from '../../SocialFeed/utils/formatters';
import { formatFiat, formatFiatAmount } from './fiat';
import { toOpenPositionHeader } from './openPositionHeader';
import type { OpenPositionPnl } from './types';

const readyPosition: OpenPositionPnl = {
  positionAmount: 1,
  isOpen: true,
  boughtUsd: 100,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 100,
  currentValueUSD: 150,
  pnlValueUsd: 50,
  pnlPercent: null,
  pnlStatus: 'ready',
};

const usd = { currency: 'USD', rate: 1 };

describe('toOpenPositionHeader', () => {
  it('shows current value and unrealized PnL when the position is ready', () => {
    const result = toOpenPositionHeader({
      position: readyPosition,
      isLoading: false,
      walletFiatBalance: '$90.00',
      conversion: usd,
    });

    expect(result.positionValue).toBe(formatFiatAmount(150, 'USD'));
    expect(result.pnl).toEqual(
      expect.objectContaining({
        isProfit: true,
        amount: formatFiat(50, 'USD'),
      }),
    );
    expect(result.expandedDetails).toEqual({
      averageCost: formatTradeUnitPrice(100),
      realizedPnl: formatFiat(0, 'USD'),
      unrealizedPnl: formatFiat(50, 'USD'),
      holdTime: EM_DASH,
    });
    expect(result.isLoading).toBe(false);
  });

  it('treats a flat position as neutral rather than a loss', () => {
    const result = toOpenPositionHeader({
      position: { ...readyPosition, currentValueUSD: 100 },
      isLoading: false,
      walletFiatBalance: '$90.00',
      conversion: usd,
    });

    expect(result.pnl).toEqual(
      expect.objectContaining({
        isProfit: true,
        amount: formatFiat(0, 'USD'),
      }),
    );
  });

  it('marks a losing position as a loss', () => {
    const result = toOpenPositionHeader({
      position: { ...readyPosition, currentValueUSD: 40 },
      isLoading: false,
      walletFiatBalance: '$90.00',
      conversion: usd,
    });

    expect(result.pnl).toEqual(
      expect.objectContaining({
        isProfit: false,
        amount: formatFiat(-60, 'USD'),
      }),
    );
  });

  it('shows the wallet balance and hides PnL while indexing', () => {
    const result = toOpenPositionHeader({
      position: { ...readyPosition, pnlStatus: 'in-progress' },
      isLoading: false,
      walletFiatBalance: '$90.00',
      conversion: usd,
    });

    expect(result).toEqual({
      positionValue: '$90.00',
      isLoading: false,
    });
  });

  it('shows the wallet balance when the route has no position', () => {
    const result = toOpenPositionHeader({
      position: null,
      isLoading: false,
      walletFiatBalance: '$90.00',
      conversion: usd,
    });

    expect(result.positionValue).toBe('$90.00');
    expect(result.pnl).toBeUndefined();
  });

  it('stays loading when there is no wallet balance yet', () => {
    const result = toOpenPositionHeader({
      position: null,
      isLoading: true,
      walletFiatBalance: undefined,
      conversion: usd,
    });

    expect(result).toEqual({ isLoading: true });
  });
});
