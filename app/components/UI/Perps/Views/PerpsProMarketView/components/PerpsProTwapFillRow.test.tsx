import { render, screen } from '@testing-library/react-native';
import type { TwapOrder, TwapOrderFill } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import { PROVIDER_CONFIG } from '../../../constants/perpsConfig';
import {
  getPerpsProTwapFillRowSelector,
  getPerpsProTwapFillValueSelector,
  PerpsProMarketViewSelectorsIDs,
} from '../../../Perps.testIds';
import { getTwapOrderProviderId } from '../../../utils/twapOrderUtils';
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

const DEFAULT_PROVIDER_ID = PROVIDER_CONFIG.DefaultProvider;

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

  it.each([
    ['buy', 'Close short'],
    ['sell', 'Close long'],
  ] as const)('labels a reduce-only %s slice as %s', (side, label) => {
    // Arrange / Act
    render(
      <PerpsProTwapFillRowItem
        row={{
          fill: buildFill({ side }),
          twapOrder: { ...twapOrder, reduceOnly: true, side },
        }}
      />,
    );

    // Assert
    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it('uses the provider/order/fill row test ID', () => {
    // Arrange / Act
    render(<PerpsProTwapFillRowItem row={{ fill: buildFill(), twapOrder }} />);

    // Assert
    expect(
      screen.getByTestId(
        getPerpsProTwapFillRowSelector(DEFAULT_PROVIDER_ID, 'twap-1', 'fill-1'),
      ),
    ).toBeOnTheScreen();
  });

  it('scopes every value element across provider and order ID collisions', () => {
    // Arrange
    const rows: { twapOrder: TwapOrder; fill: TwapOrderFill }[] = [
      {
        twapOrder: { ...twapOrder, providerId: 'hyperliquid' },
        fill: buildFill({ fillId: 'shared-fill' }),
      },
      {
        twapOrder: { ...twapOrder, providerId: 'lighter' },
        fill: buildFill({ fillId: 'shared-fill' }),
      },
      {
        twapOrder: {
          ...twapOrder,
          providerId: 'hyperliquid',
          orderId: 'twap-2',
        },
        fill: buildFill({
          fillId: 'shared-fill',
          orderId: 'twap-2',
        }),
      },
    ];
    const valueTestIDs = [
      PerpsProMarketViewSelectorsIDs.TWAP_FILL_MARKET,
      PerpsProMarketViewSelectorsIDs.TWAP_FILL_DIRECTION,
      PerpsProMarketViewSelectorsIDs.TWAP_FILL_PRICE,
      PerpsProMarketViewSelectorsIDs.TWAP_FILL_TIME,
      PerpsProMarketViewSelectorsIDs.TWAP_FILL_SIZE,
    ];

    // Act
    render(
      <>
        {rows.map((row) => (
          <PerpsProTwapFillRowItem
            key={`${row.twapOrder.providerId}:${row.twapOrder.orderId}`}
            row={row}
          />
        ))}
      </>,
    );

    // Assert
    for (const row of rows) {
      for (const baseTestID of valueTestIDs) {
        expect(
          screen.getByTestId(
            getPerpsProTwapFillValueSelector(
              baseTestID,
              getTwapOrderProviderId(row.twapOrder),
              row.twapOrder.orderId,
              row.fill.fillId,
            ),
          ),
        ).toBeOnTheScreen();
      }
    }
  });
});
