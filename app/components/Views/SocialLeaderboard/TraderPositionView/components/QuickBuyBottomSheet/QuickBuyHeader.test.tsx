import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import QuickBuyHeader from './QuickBuyHeader';

jest.mock('../../../components/PositionTokenAvatar', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ position }: { position: Position }) =>
      ReactMock.createElement(
        Text,
        { testID: 'mock-position-token-avatar' },
        position.tokenSymbol,
      ),
  };
});

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
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

describe('QuickBuyHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title with the token symbol', () => {
    renderWithProvider(
      <QuickBuyHeader
        position={createPosition({ tokenSymbol: 'PEPE' })}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByText('social_leaderboard.quick_buy.title:{"symbol":"PEPE"}'),
    ).toBeOnTheScreen();
  });

  it('renders the position token avatar', () => {
    renderWithProvider(
      <QuickBuyHeader
        position={createPosition({ tokenSymbol: 'PEPE' })}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId('mock-position-token-avatar')).toBeOnTheScreen();
  });

  describe('market cap subtitle', () => {
    it('renders only the label when marketCap is undefined', () => {
      renderWithProvider(
        <QuickBuyHeader position={createPosition()} onClose={jest.fn()} />,
      );

      expect(
        screen.getByText('social_leaderboard.quick_buy.market_cap_label'),
      ).toBeOnTheScreen();
    });

    it('renders the formatted market cap with the label when provided in millions', () => {
      renderWithProvider(
        <QuickBuyHeader
          position={createPosition()}
          marketCap={2_300_000}
          onClose={jest.fn()}
        />,
      );

      expect(
        screen.getByText('$2.3M social_leaderboard.quick_buy.market_cap_label'),
      ).toBeOnTheScreen();
    });

    it('renders the formatted market cap with the label when provided in thousands', () => {
      renderWithProvider(
        <QuickBuyHeader
          position={createPosition()}
          marketCap={25_000}
          onClose={jest.fn()}
        />,
      );

      expect(
        screen.getByText('$25K social_leaderboard.quick_buy.market_cap_label'),
      ).toBeOnTheScreen();
    });

    it('treats a zero marketCap as a present value and prefixes "$0"', () => {
      renderWithProvider(
        <QuickBuyHeader
          position={createPosition()}
          marketCap={0}
          onClose={jest.fn()}
        />,
      );

      expect(
        screen.getByText('$0 social_leaderboard.quick_buy.market_cap_label'),
      ).toBeOnTheScreen();
    });
  });

  describe('close button', () => {
    it('calls onClose when the close button is pressed', () => {
      const onClose = jest.fn();
      renderWithProvider(
        <QuickBuyHeader position={createPosition()} onClose={onClose} />,
      );

      fireEvent.press(screen.getByTestId('quick-buy-close-button'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
