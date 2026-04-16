import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PositionRow from './PositionRow';
import type { Position } from '@metamask/social-controllers';

jest.mock('../../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn().mockReturnValue('https://example.com/token.png'),
}));

jest.mock('../../utils/chainMapping', () => ({
  chainNameToId: jest.fn((chain: string) =>
    chain === 'unknown' ? undefined : 'eip155:1',
  ),
}));

jest.mock('../../../../UI/Perps/utils/formatUtils', () => {
  const actual = jest.requireActual('../../../../UI/Perps/utils/formatUtils');
  return {
    ...actual,
    formatOrderCardDate: jest.fn().mockReturnValue('Apr 15 at 2:00 PM'),
  };
});

const basePosition: Position = {
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

  it('renders formatted token amount', () => {
    renderWithProvider(<PositionRow position={basePosition} />);

    expect(screen.getByText('1,500,000,000 STARKBOT')).toBeOnTheScreen();
  });

  it('renders current value formatted as USD', () => {
    renderWithProvider(<PositionRow position={basePosition} />);
    expect(screen.getByText('$2,259.96')).toBeOnTheScreen();
  });

  it('renders positive PnL percent with plus sign', () => {
    renderWithProvider(<PositionRow position={basePosition} />);
    expect(screen.getByText('+182%')).toBeOnTheScreen();
  });

  it('renders negative PnL percent', () => {
    const position = { ...basePosition, pnlPercent: -25 };

    renderWithProvider(<PositionRow position={position} />);
    expect(screen.getByText('-25%')).toBeOnTheScreen();
  });

  it('renders dash when pnlPercent is null', () => {
    const position = {
      ...basePosition,
      pnlPercent: null,
    } as unknown as Position;

    renderWithProvider(<PositionRow position={position} />);
    expect(screen.getByText('\u2014')).toBeOnTheScreen();
  });

  it('renders dash when currentValueUSD is null', () => {
    const position = {
      ...basePosition,
      currentValueUSD: null,
    } as unknown as Position;

    renderWithProvider(<PositionRow position={position} />);

    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders zero PnL percent with plus sign', () => {
    const position = { ...basePosition, pnlPercent: 0 };

    renderWithProvider(<PositionRow position={position} />);
    expect(screen.getByText('+0%')).toBeOnTheScreen();
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
    it('renders soldUsd as the value', () => {
      renderWithProvider(<PositionRow position={closedPosition} />);

      expect(screen.getByText('$1,500.00')).toBeOnTheScreen();
    });

    it('renders formatted closed date as subtitle instead of token amount', () => {
      renderWithProvider(<PositionRow position={closedPosition} />);

      expect(screen.getByText('Apr 15 at 2:00 PM')).toBeOnTheScreen();
    });

    it('renders realized PnL percent', () => {
      renderWithProvider(<PositionRow position={closedPosition} />);

      // realizedPnl (300) / boughtUsd (1200) * 100 = 25%
      expect(screen.getByText('+25%')).toBeOnTheScreen();
    });

    it('renders dash for PnL when boughtUsd is zero', () => {
      const position = { ...closedPosition, boughtUsd: 0 };

      renderWithProvider(<PositionRow position={position} />);

      expect(screen.getByText('\u2014')).toBeOnTheScreen();
    });

    it('renders soldUsd as value even when currentValueUSD is zero', () => {
      const position = { ...closedPosition, currentValueUSD: 0 };

      renderWithProvider(<PositionRow position={position} />);

      expect(screen.getByText('$1,500.00')).toBeOnTheScreen();
    });

    it('renders negative realized PnL percent', () => {
      const position = { ...closedPosition, realizedPnl: -300 };

      renderWithProvider(<PositionRow position={position} />);

      // -300 / 1200 * 100 = -25%
      expect(screen.getByText('-25%')).toBeOnTheScreen();
    });
  });
});
