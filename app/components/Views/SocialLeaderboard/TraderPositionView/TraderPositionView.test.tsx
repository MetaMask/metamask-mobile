import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TraderPositionView from './TraderPositionView';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import type { Position } from '@metamask/social-controllers';

const mockGoBack = jest.fn();
const mockGetAssetImageUrl = jest.fn();

interface MockRouteParams {
  traderId: string;
  traderName: string;
  tokenSymbol: string;
  position?: Position;
}

let mockRouteParams: MockRouteParams = {
  traderId: 'trader-1',
  traderName: 'dutchiono',
  tokenSymbol: 'PEPE',
  position: {
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    chain: 'base',
    positionAmount: 1000,
    boughtUsd: 500,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 500,
    trades: [],
    lastTradeAt: Date.now(),
    currentValueUSD: 900,
    pnlValueUsd: 400,
    pnlPercent: 80,
  },
};

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
}));

describe('TraderPositionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAssetImageUrl.mockReturnValue('https://example.com/token.png');
    mockRouteParams = {
      traderId: 'trader-1',
      traderName: 'dutchiono',
      tokenSymbol: 'PEPE',
      position: {
        tokenSymbol: 'PEPE',
        tokenName: 'Pepe',
        tokenAddress: '0x1234567890123456789012345678901234567890',
        chain: 'base',
        positionAmount: 1000,
        boughtUsd: 500,
        soldUsd: 0,
        realizedPnl: 0,
        costBasis: 500,
        trades: [],
        lastTradeAt: Date.now(),
        currentValueUSD: 900,
        pnlValueUsd: 400,
        pnlPercent: 80,
      },
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the container, route content, and mock trade rows', () => {
    renderWithProvider(<TraderPositionView />);

    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.getByText('dutchiono')).toBeOnTheScreen();
    expect(screen.getAllByText('PEPE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$14,670')).toBeOnTheScreen();
    expect(screen.getByTestId('trade-row-1')).toBeOnTheScreen();
    expect(screen.getByTestId('trade-row-2')).toBeOnTheScreen();
  });

  it('calls goBack when the close button is pressed', () => {
    renderWithProvider(<TraderPositionView />);

    fireEvent.press(
      screen.getByTestId(TraderPositionViewSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to the mock token symbol when the route token symbol is empty', () => {
    mockRouteParams.tokenSymbol = '';

    renderWithProvider(<TraderPositionView />);

    expect(screen.getByText('PUNCH')).toBeOnTheScreen();
  });

  it('renders the buy button', () => {
    renderWithProvider(<TraderPositionView />);

    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
    ).toBeOnTheScreen();
  });

  it('builds the token image URL when the position chain is supported', () => {
    renderWithProvider(<TraderPositionView />);

    expect(mockGetAssetImageUrl).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      'eip155:8453',
    );
  });

  it('skips token image URL resolution when the position chain is unsupported', () => {
    mockRouteParams.position = {
      ...mockRouteParams.position,
      chain: 'unsupported-chain',
    } as Position;

    renderWithProvider(<TraderPositionView />);

    expect(mockGetAssetImageUrl).not.toHaveBeenCalled();
  });
});
