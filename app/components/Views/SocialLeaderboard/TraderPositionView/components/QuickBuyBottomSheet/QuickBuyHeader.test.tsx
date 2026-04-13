import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { Position } from '@metamask/social-controllers';
import QuickBuyHeader from './QuickBuyHeader';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) =>
    params?.symbol ? `${params.symbol}` : key,
}));

const createPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    chain: 'base',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    positionAmount: 1000,
    boughtUsd: 500,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 500,
    trades: [],
    lastTradeAt: 0,
    currentValueUSD: 900,
    pnlValueUsd: 400,
    pnlPercent: 80,
    ...overrides,
  }) as Position;

const createDestToken = (overrides: Partial<BridgeToken> = {}): BridgeToken =>
  ({
    address: '0xDEST',
    chainId: '0x2105',
    decimals: 18,
    symbol: 'PEPE',
    name: 'Pepe',
    image: 'https://example.com/pepe.png',
    ...overrides,
  }) as BridgeToken;

describe('QuickBuyHeader', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders the token symbol in the title', () => {
    renderWithProvider(
      <QuickBuyHeader
        position={createPosition()}
        destToken={createDestToken()}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('PEPE')).toBeOnTheScreen();
  });

  it('renders the market cap label', () => {
    renderWithProvider(
      <QuickBuyHeader
        position={createPosition()}
        destToken={createDestToken()}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByText('social_leaderboard.quick_buy.market_cap_label'),
    ).toBeOnTheScreen();
  });

  it('calls onClose when the close button is pressed', () => {
    renderWithProvider(
      <QuickBuyHeader
        position={createPosition()}
        destToken={createDestToken()}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByTestId('quick-buy-close-button'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders without a destToken (while metadata is loading)', () => {
    renderWithProvider(
      <QuickBuyHeader
        position={createPosition()}
        destToken={undefined}
        onClose={mockOnClose}
      />,
    );

    // Token symbol still shows — the header should not crash without an image
    expect(screen.getByText('PEPE')).toBeOnTheScreen();
  });
});
