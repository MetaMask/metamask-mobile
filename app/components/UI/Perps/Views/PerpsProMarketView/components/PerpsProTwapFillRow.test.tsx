import { render, screen } from '@testing-library/react-native';
import type { TwapOrder, TwapOrderFill } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProTwapFillRowItem from './PerpsProTwapFillRow';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

const twapOrder: TwapOrder = {
  orderId: 'twap-1',
  symbol: 'BTC',
  side: 'buy',
  size: '10',
  executedSize: '4',
  remainingSize: '6',
  executedNotional: '400',
  fillProgressBps: 4000,
  timeProgressBps: 5000,
  elapsedTimeMilliseconds: 600_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_700_000_000_000,
  lastUpdated: 1_700_000_600_000,
  fills: [],
};

const buildFill = (overrides: Partial<TwapOrderFill> = {}): TwapOrderFill => ({
  fillId: 'fill-1',
  orderId: 'twap-1',
  side: 'buy',
  price: '50000',
  size: '1.5',
  fee: '0.5',
  feeToken: 'USDC',
  timestamp: 1_700_000_100_000,
  transactionHash: '0xabc',
  ...overrides,
});

describe('PerpsProTwapFillRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSelector).mockReturnValue(false);
  });

  it('names the parent market of the slice', () => {
    // Arrange / Act
    render(<PerpsProTwapFillRowItem row={{ fill: buildFill(), twapOrder }} />);

    // Assert
    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('renders the slice price and size against its market', () => {
    // Arrange / Act
    render(<PerpsProTwapFillRowItem row={{ fill: buildFill(), twapOrder }} />);

    // Assert
    expect(screen.getByText('$50,000')).toBeOnTheScreen();
    expect(screen.getByText(/1\.5 BTC/u)).toBeOnTheScreen();
  });

  it('hides the slice price and size in privacy mode', () => {
    // Arrange
    jest.mocked(useSelector).mockReturnValue(true);

    // Act
    render(<PerpsProTwapFillRowItem row={{ fill: buildFill(), twapOrder }} />);

    // Assert
    expect(screen.queryByText('$50,000')).toBeNull();
    expect(screen.queryByText(/1\.5 BTC/u)).toBeNull();
  });

  it('labels a buy slice long and a sell slice short', () => {
    // Arrange / Act
    const { rerender } = render(
      <PerpsProTwapFillRowItem
        row={{ fill: buildFill({ side: 'buy' }), twapOrder }}
      />,
    );

    // Assert
    expect(screen.getByText('Long')).toBeOnTheScreen();

    // Act
    rerender(
      <PerpsProTwapFillRowItem
        row={{ fill: buildFill({ side: 'sell' }), twapOrder }}
      />,
    );

    // Assert
    expect(screen.getByText('Short')).toBeOnTheScreen();
  });

  it('carries the supplied test ID', () => {
    // Arrange / Act
    render(
      <PerpsProTwapFillRowItem
        row={{ fill: buildFill(), twapOrder }}
        testID="fill-row-1"
      />,
    );

    // Assert
    expect(screen.getByTestId('fill-row-1')).toBeOnTheScreen();
  });

  it('falls back to the shared row test ID', () => {
    // Arrange / Act
    render(<PerpsProTwapFillRowItem row={{ fill: buildFill(), twapOrder }} />);

    // Assert
    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.TWAP_FILL_ROW),
    ).toBeOnTheScreen();
  });
});
