import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TraderPositionView from './TraderPositionView';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import type { Position, Trade } from '@metamask/social-controllers';

const mockGoBack = jest.fn();
const mockGetAssetImageUrl = jest.fn();

interface MockRouteParams {
  traderId: string;
  traderName: string;
  tokenSymbol: string;
  position?: Position;
}

const mockTrades: Trade[] = [
  {
    intent: 'enter',
    direction: 'buy',
    tokenAmount: 1000,
    usdCost: 2200,
    timestamp: 1709568900000,
    transactionHash: '0xabc',
  },
  {
    intent: 'exit',
    direction: 'sell',
    tokenAmount: 500,
    usdCost: 1100,
    timestamp: 1709564520000,
    transactionHash: '0xdef',
  },
];

const defaultPosition: Position = {
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x1234567890123456789012345678901234567890',
  chain: 'base',
  positionAmount: 1000,
  boughtUsd: 500,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 500,
  trades: mockTrades,
  lastTradeAt: Date.now(),
  currentValueUSD: 900,
  pnlValueUsd: 400,
  pnlPercent: 80,
};

let mockRouteParams: MockRouteParams = {
  traderId: 'trader-1',
  traderName: 'dutchiono',
  tokenSymbol: 'PEPE',
  position: defaultPosition,
};

const mockState = {
  engine: {
    backgroundState: {
      TokenRatesController: {
        marketData: {},
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
      },
    },
  },
};

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn().mockResolvedValue({}),
}));

// Mock fetch for historical prices API
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ prices: [] }),
}) as jest.Mock;

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');

  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: (...args: unknown[]) => mockGetAssetImageUrl(...args),
  toAssetId: (address: string, chainId: string) =>
    `${chainId}/erc20:${address}`,
}));

describe('TraderPositionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAssetImageUrl.mockReturnValue('https://example.com/token.png');
    mockRouteParams = {
      traderId: 'trader-1',
      traderName: 'dutchiono',
      tokenSymbol: 'PEPE',
      position: defaultPosition,
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the container with real position data', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.getByText('dutchiono')).toBeOnTheScreen();
    expect(screen.getAllByText('PEPE').length).toBeGreaterThanOrEqual(1);
  });

  it('renders trade rows from position.trades', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(screen.getByTestId('trade-row-0xabc')).toBeOnTheScreen();
    expect(screen.getByTestId('trade-row-0xdef')).toBeOnTheScreen();
  });

  it('shows "No trades" when trades array is empty', () => {
    mockRouteParams.position = { ...defaultPosition, trades: [] };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(screen.getByText('No trades')).toBeOnTheScreen();
  });

  it('calls goBack when the close button is pressed', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    fireEvent.press(
      screen.getByTestId(TraderPositionViewSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to the route tokenSymbol when position is undefined', () => {
    mockRouteParams.position = undefined;
    mockRouteParams.tokenSymbol = 'DOGE';

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(screen.getAllByText('DOGE').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the buy button', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
    ).toBeOnTheScreen();
  });

  it('builds the token image URL when the position chain is supported', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(mockGetAssetImageUrl).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      'eip155:8453',
    );
  });

  it('skips token image URL resolution when the position chain is unsupported', () => {
    mockRouteParams.position = {
      ...defaultPosition,
      chain: 'unsupported-chain',
    };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(mockGetAssetImageUrl).not.toHaveBeenCalled();
  });

  it('displays market cap from TokenRatesController when available', () => {
    const stateWithMarket = {
      engine: {
        backgroundState: {
          TokenRatesController: {
            marketData: {
              '0x2105': {
                '0x1234567890123456789012345678901234567890': {
                  marketCap: 11700000,
                  pricePercentChange1d: 7.2,
                },
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
          },
        },
      },
    };

    renderWithProvider(<TraderPositionView />, { state: stateWithMarket });

    expect(screen.getByText('$11.7M')).toBeOnTheScreen();
  });
});
