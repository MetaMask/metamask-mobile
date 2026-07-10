import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PositionRow from './PositionRow';
import type { Position } from '@metamask/social-controllers';

const colorOf = (node: ReturnType<typeof screen.getByText>) =>
  (StyleSheet.flatten(node.props.style) as { color?: string } | undefined)
    ?.color;

jest.mock('../../components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../utils/formatters', () => {
  const actual = jest.requireActual('../../utils/formatters');
  return {
    ...actual,
    formatTradeDate: jest.fn().mockReturnValue('Apr 15 at 2:00 pm'),
  };
});

const basePosition: Position = {
  positionId: 'starkbot-base',
  tokenSymbol: 'STARKBOT',
  tokenName: 'Starkbot',
  tokenAddress: '0x123',
  chain: 'base',
  positionAmount: 1500000000,
  boughtUsd: 1200,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 1200,
  trades: [],
  lastTradeAt: Date.now(),
  currentValueUSD: 2259.96,
  pnlValueUsd: 1059.96,
  pnlPercent: 182,
};

const closedPosition: Position = {
  ...basePosition,
  positionAmount: 0,
  soldUsd: 1500,
  realizedPnl: 300,
  boughtUsd: 1200,
  currentValueUSD: 0,
  pnlValueUsd: null,
  pnlPercent: null,
};

describe('PositionRow', () => {
  it('renders the row testID', () => {
    renderWithProvider(<PositionRow position={basePosition} />);

    expect(screen.getByTestId('position-row-STARKBOT')).toBeOnTheScreen();
  });

  it('renders the token symbol', () => {
    renderWithProvider(<PositionRow position={basePosition} />);

    expect(screen.getAllByText('STARKBOT')[0]).toBeOnTheScreen();
  });

  it('renders formatted token amount abbreviated for large values', () => {
    renderWithProvider(<PositionRow position={basePosition} />);

    expect(screen.getByText('1.50B STARKBOT')).toBeOnTheScreen();
  });

  it('renders last trade date instead of token amount when showTradeDate is set', () => {
    renderWithProvider(<PositionRow position={basePosition} showTradeDate />);

    expect(screen.getByText('Apr 15 at 2:00 pm')).toBeOnTheScreen();
    expect(screen.queryByText('1.50B STARKBOT')).toBeNull();
  });

  it('renders current value formatted as USD on the top-right', () => {
    renderWithProvider(<PositionRow position={basePosition} />);
    expect(screen.getByText('$2,259.96')).toBeOnTheScreen();
  });

  it('renders a plus sign with the percent on the bottom-right (no absolute PnL)', () => {
    renderWithProvider(<PositionRow position={basePosition} />);
    expect(screen.getByText('+182.00%')).toBeOnTheScreen();
    expect(screen.queryByText('▲')).toBeNull();
    expect(screen.queryByText('▼')).toBeNull();
    expect(screen.queryByText('182.00%')).toBeNull();
    expect(screen.queryByText('+$1,059.96 (+182%)')).toBeNull();
    expect(screen.queryByText('+$1,059.96')).toBeNull();
  });

  it('colors the signed percent for a winning position', () => {
    renderWithProvider(<PositionRow position={basePosition} />);
    const percentColor = colorOf(screen.getByText('+182.00%'));
    expect(percentColor).toBeDefined();
  });

  it('renders a minus sign with the percent for a losing open position', () => {
    const position = {
      ...basePosition,
      pnlValueUsd: -250,
      pnlPercent: -25,
    };

    renderWithProvider(<PositionRow position={position} />);
    expect(screen.getByText('-25.00%')).toBeOnTheScreen();
    expect(screen.queryByText('▲')).toBeNull();
    expect(screen.queryByText('▼')).toBeNull();
    expect(screen.queryByText('25.00%')).toBeNull();
    expect(screen.queryByText('-$250.00 (-25%)')).toBeNull();
  });

  it('colors the signed percent for a losing position', () => {
    const position = { ...basePosition, pnlValueUsd: -250, pnlPercent: -25 };

    renderWithProvider(<PositionRow position={position} />);
    const percentColor = colorOf(screen.getByText('-25.00%'));
    expect(percentColor).toBeDefined();
  });

  it('renders the percent even when pnlValueUsd is missing', () => {
    const position = {
      ...basePosition,
      pnlValueUsd: null,
    } as unknown as Position;

    renderWithProvider(<PositionRow position={position} />);
    expect(screen.getByText('+182.00%')).toBeOnTheScreen();
  });

  it('renders dash when pnlPercent is null', () => {
    const position = {
      ...basePosition,
      pnlPercent: null,
      pnlValueUsd: null,
    } as unknown as Position;

    renderWithProvider(<PositionRow position={position} />);
    expect(screen.getByText('—')).toBeOnTheScreen();
  });

  it('renders dash when currentValueUSD is null', () => {
    const position = {
      ...basePosition,
      currentValueUSD: null,
    } as unknown as Position;

    renderWithProvider(<PositionRow position={position} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders signed 0% without a direction arrow when unrealized PnL is zero', () => {
    const position = {
      ...basePosition,
      pnlValueUsd: 0,
      pnlPercent: 0,
    };

    renderWithProvider(<PositionRow position={position} />);
    expect(screen.getByText('+0.00%')).toBeOnTheScreen();
    expect(screen.queryByText('▲')).toBeNull();
    expect(screen.queryByText('▼')).toBeNull();
    expect(screen.queryByText('$0.00 (+0%)')).toBeNull();
  });

  it('renders negative USD value', () => {
    const position = { ...basePosition, currentValueUSD: -150.5 };

    renderWithProvider(<PositionRow position={position} />);
    expect(screen.getByText('-$150.50')).toBeOnTheScreen();
  });

  it('renders zero USD value', () => {
    const position = { ...basePosition, currentValueUSD: 0 };

    renderWithProvider(<PositionRow position={position} />);
    expect(screen.getByText('$0.00')).toBeOnTheScreen();
  });

  it('renders token amount with decimals', () => {
    const position = { ...basePosition, positionAmount: 1.5 };

    renderWithProvider(<PositionRow position={position} />);

    expect(screen.getByText('1.5 STARKBOT')).toBeOnTheScreen();
  });

  it('renders negative token amount', () => {
    const position = { ...basePosition, positionAmount: -500 };

    renderWithProvider(<PositionRow position={position} />);

    expect(screen.getByText('-500 STARKBOT')).toBeOnTheScreen();
  });

  it('calls onPress with the position when tapped', () => {
    const onPress = jest.fn();

    renderWithProvider(
      <PositionRow position={basePosition} onPress={onPress} />,
    );

    fireEvent.press(screen.getByTestId('position-row-STARKBOT'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(basePosition);
  });

  it('renders the row without a token image when the chain is not recognized', () => {
    const position = { ...basePosition, chain: 'unknown' };

    renderWithProvider(<PositionRow position={position} />);

    expect(screen.getByTestId('position-row-STARKBOT')).toBeOnTheScreen();
  });

  it('formats large USD values with commas', () => {
    const position = { ...basePosition, currentValueUSD: 1234567.89 };

    renderWithProvider(<PositionRow position={position} />);

    expect(screen.getByText('$1,234,567.89')).toBeOnTheScreen();
  });

  it('uses the token symbol in the testID', () => {
    const position = { ...basePosition, tokenSymbol: 'PEPE' };

    renderWithProvider(<PositionRow position={position} />);

    expect(screen.getByTestId('position-row-PEPE')).toBeOnTheScreen();
  });

  describe('closed position', () => {
    it('renders realized $ PnL as the top-right value (not soldUsd)', () => {
      renderWithProvider(<PositionRow position={closedPosition} />);

      // realizedPnl = 300 → "+$300.00"; soldUsd value ("$1,500.00") must not appear.
      expect(screen.getByText('+$300.00')).toBeOnTheScreen();
      expect(screen.queryByText('$1,500.00')).toBeNull();
    });

    it('renders realized PnL with negative sign and value when at a loss', () => {
      const position = { ...closedPosition, realizedPnl: -300 };

      renderWithProvider(<PositionRow position={position} />);

      expect(screen.getByText('-$300.00')).toBeOnTheScreen();
    });

    it('renders formatted closed date as subtitle instead of token amount', () => {
      renderWithProvider(<PositionRow position={closedPosition} />);

      expect(screen.getByText('Apr 15 at 2:00 pm')).toBeOnTheScreen();
    });

    it('renders realized PnL percent with a plus sign', () => {
      renderWithProvider(<PositionRow position={closedPosition} />);

      // realizedPnl (300) / boughtUsd (1200) * 100 = 25%
      expect(screen.getByText('+25.00%')).toBeOnTheScreen();
      expect(screen.queryByText('▲')).toBeNull();
      expect(screen.queryByText('▼')).toBeNull();
    });

    it('renders dash for PnL when boughtUsd is zero', () => {
      const position = { ...closedPosition, boughtUsd: 0 };

      renderWithProvider(<PositionRow position={position} />);

      expect(screen.getByText('—')).toBeOnTheScreen();
    });

    it('renders negative realized PnL percent with a minus sign', () => {
      const position = { ...closedPosition, realizedPnl: -300 };

      renderWithProvider(<PositionRow position={position} />);

      // -300 / 1200 * 100 = -25%
      expect(screen.getByText('-25.00%')).toBeOnTheScreen();
      expect(screen.queryByText('▲')).toBeNull();
      expect(screen.queryByText('▼')).toBeNull();
    });

    it('uses realized PnL percent even when pnlPercent is 0', () => {
      const position = { ...closedPosition, pnlPercent: 0 };

      renderWithProvider(<PositionRow position={position} />);

      expect(screen.getByText('+25.00%')).toBeOnTheScreen();
    });

    it('renders break-even realized PnL with signed 0% percent', () => {
      const position = { ...closedPosition, realizedPnl: 0, boughtUsd: 1200 };

      renderWithProvider(<PositionRow position={position} />);

      expect(screen.getByText('$0.00')).toBeOnTheScreen();
      expect(screen.getByText('+0.00%')).toBeOnTheScreen();
      expect(screen.queryByText('▲')).toBeNull();
      expect(screen.queryByText('▼')).toBeNull();
    });

    it('renders realized PnL value when boughtUsd is zero (percent null)', () => {
      const positivePosition = {
        ...closedPosition,
        realizedPnl: 300,
        boughtUsd: 0,
      };
      const { unmount } = renderWithProvider(
        <PositionRow position={positivePosition} />,
      );
      expect(screen.getByText('+$300.00')).toBeOnTheScreen();
      unmount();

      const negativePosition = {
        ...closedPosition,
        realizedPnl: -300,
        boughtUsd: 0,
      };
      renderWithProvider(<PositionRow position={negativePosition} />);
      expect(screen.getByText('-$300.00')).toBeOnTheScreen();
    });
  });

  describe('perp positions', () => {
    const perpPosition: Position = {
      ...basePosition,
      tokenSymbol: 'ETH',
      chain: 'hyperliquid',
      perpPositionType: 'long',
      perpLeverage: 5,
      positionAmountWithLeverage: 25,
    };

    it('renders the leverage and LONG direction badges for a long perp', () => {
      renderWithProvider(<PositionRow position={perpPosition} />);

      expect(screen.getByText('5x')).toBeOnTheScreen();
      expect(screen.getByText('LONG')).toBeOnTheScreen();
    });

    it('renders a SHORT badge for a short perp', () => {
      const position = { ...perpPosition, perpPositionType: 'short' as const };

      renderWithProvider(<PositionRow position={position} />);

      expect(screen.getByText('SHORT')).toBeOnTheScreen();
    });

    it('omits the leverage badge when perpLeverage is null', () => {
      const position = { ...perpPosition, perpLeverage: null };

      renderWithProvider(<PositionRow position={position} />);

      expect(screen.queryByText('5x')).not.toBeOnTheScreen();
      expect(screen.getByText('LONG')).toBeOnTheScreen();
    });

    it('does not render perp badges for a spot position', () => {
      renderWithProvider(<PositionRow position={basePosition} />);

      expect(screen.queryByText('LONG')).not.toBeOnTheScreen();
      expect(screen.queryByText('SHORT')).not.toBeOnTheScreen();
    });

    it('hides the HIP-3 provider prefix in the symbol and amount subtitle', () => {
      const hip3Position: Position = {
        ...perpPosition,
        tokenSymbol: 'cash:SPCX',
        positionAmount: 3,
        positionAmountWithLeverage: 3,
      };

      renderWithProvider(<PositionRow position={hip3Position} />);

      expect(screen.getByText('SPCX')).toBeOnTheScreen();
      expect(screen.getByText('3 SPCX')).toBeOnTheScreen();
      expect(screen.queryByText('cash:SPCX')).toBeNull();
    });

    it('shows the current value (not PnL) as the top-right value for an open perp, matching spot', () => {
      renderWithProvider(<PositionRow position={perpPosition} />);

      // Open perps mirror open spot: the headline figure is the current
      // position value (neutral), not the signed PnL.
      expect(screen.getByText('$2,259.96')).toBeOnTheScreen();
      expect(screen.queryByText('+$1,059.96')).not.toBeOnTheScreen();
    });

    it('shows the trade date (not the position amount) for a closed perp', () => {
      const closedPerp = { ...perpPosition, currentValueUSD: 0 };

      renderWithProvider(<PositionRow position={closedPerp} isClosed />);

      expect(screen.getByText('Apr 15 at 2:00 pm')).toBeOnTheScreen();
      // Not the "<amount> ETH" subtitle that open positions show.
      expect(screen.queryByText('1.50B ETH')).not.toBeOnTheScreen();
    });

    it('renders a plus sign with a colored percent for a winning closed perp', () => {
      const closedPerp = {
        ...perpPosition,
        currentValueUSD: 0,
        realizedPnl: 300,
        boughtUsd: 1200,
        pnlValueUsd: 300,
      };

      renderWithProvider(<PositionRow position={closedPerp} isClosed />);

      // 300 / 1200 * 100 = 25%
      expect(screen.getByText('+25.00%')).toBeOnTheScreen();
      expect(screen.queryByText('▲')).toBeNull();
      expect(screen.queryByText('▼')).toBeNull();
    });

    it('renders a minus sign with a colored percent for a losing closed perp', () => {
      const closedPerp = {
        ...perpPosition,
        currentValueUSD: 0,
        realizedPnl: -300,
        boughtUsd: 1200,
        pnlValueUsd: -300,
      };

      renderWithProvider(<PositionRow position={closedPerp} isClosed />);

      expect(screen.getByText('-25.00%')).toBeOnTheScreen();
      expect(screen.queryByText('▲')).toBeNull();
      expect(screen.queryByText('▼')).toBeNull();
    });

    it('renders the plus sign with the percent for an open perp', () => {
      renderWithProvider(<PositionRow position={perpPosition} />);

      expect(screen.getByText('+182.00%')).toBeOnTheScreen();
      expect(screen.queryByText('▲')).toBeNull();
      expect(screen.queryByText('▼')).toBeNull();
    });
  });
});
