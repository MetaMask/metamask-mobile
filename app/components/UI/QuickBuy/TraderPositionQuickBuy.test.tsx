import React from 'react';
import { render } from '@testing-library/react-native';
import TraderPositionQuickBuy from './TraderPositionQuickBuy';
import type { Position } from '@metamask/social-controllers';

const mockQuickBuyRoot = jest.fn((_props: unknown) => null);

jest.mock('./quickBuy', () => ({
  QuickBuy: {
    Root: (props: unknown) => mockQuickBuyRoot(props),
  },
}));

jest.mock('./features', () => ({
  TOP_TRADERS_QUICK_BUY_FEATURES: { tradeModes: ['buy', 'sell'] },
}));

jest.mock('./types', () => {
  const actual = jest.requireActual('./types');
  return { positionToQuickBuyTarget: actual.positionToQuickBuyTarget };
});

const mockPosition: Position = {
  tokenAddress: '0xtoken',
  tokenSymbol: 'TKN',
  tokenName: 'Token',
  chain: 'ethereum',
} as unknown as Position;

describe('TraderPositionQuickBuy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <TraderPositionQuickBuy
        isVisible
        position={mockPosition}
        onClose={jest.fn()}
      />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalled();
  });

  it('passes null target when position is null', () => {
    render(
      <TraderPositionQuickBuy isVisible position={null} onClose={jest.fn()} />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ target: null }),
    );
  });

  it('maps position to a QuickBuyTarget with a CAIP chain id', () => {
    render(
      <TraderPositionQuickBuy
        isVisible
        position={mockPosition}
        onClose={jest.fn()}
      />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          tokenAddress: '0xtoken',
          tokenSymbol: 'TKN',
          tokenName: 'Token',
          chain: 'eip155:1',
        },
      }),
    );
  });

  it('passes null target when the position chain name has no CAIP mapping', () => {
    const unsupportedPosition: Position = {
      tokenAddress: '0xtoken',
      tokenSymbol: 'TKN',
      tokenName: 'Token',
      chain: 'narnia',
    } as unknown as Position;

    render(
      <TraderPositionQuickBuy
        isVisible
        position={unsupportedPosition}
        onClose={jest.fn()}
      />,
    );

    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ target: null }),
    );
  });

  it('passes analyticsContext when at least one analytics prop is defined', () => {
    render(
      <TraderPositionQuickBuy
        isVisible
        position={mockPosition}
        onClose={jest.fn()}
        traderAddress="0xtrader"
        marketCap={1000000}
        source="profile_position"
        originalEntryPoint="leaderboard"
      />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsContext: {
          traderAddress: '0xtrader',
          marketCap: 1000000,
          source: 'profile_position',
          originalEntryPoint: 'leaderboard',
        },
      }),
    );
  });

  it('passes undefined analyticsContext when no analytics props are provided', () => {
    render(
      <TraderPositionQuickBuy
        isVisible
        position={mockPosition}
        onClose={jest.fn()}
      />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ analyticsContext: undefined }),
    );
  });

  it('maps isTraderPositionClosed to traderTradeType in analyticsContext', () => {
    render(
      <TraderPositionQuickBuy
        isVisible
        position={mockPosition}
        onClose={jest.fn()}
        source="profile_position"
        originalEntryPoint="leaderboard"
        isTraderPositionClosed
      />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsContext: expect.objectContaining({
          source: 'profile_position',
          originalEntryPoint: 'leaderboard',
          traderTradeType: 'sell',
        }),
      }),
    );
  });

  it('passes only defined analytics props in context', () => {
    render(
      <TraderPositionQuickBuy
        isVisible
        position={mockPosition}
        onClose={jest.fn()}
        traderAddress="0xtrader"
      />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsContext: {
          traderAddress: '0xtrader',
          marketCap: undefined,
          source: undefined,
          originalEntryPoint: undefined,
        },
      }),
    );
  });

  it('forwards isVisible and onClose to QuickBuy.Root', () => {
    const onClose = jest.fn();
    render(
      <TraderPositionQuickBuy
        isVisible={false}
        position={null}
        onClose={onClose}
      />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({ isVisible: false, onClose }),
    );
  });

  it('passes features that include both buy and sell tradeModes', () => {
    render(
      <TraderPositionQuickBuy
        isVisible
        position={mockPosition}
        onClose={jest.fn()}
      />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        features: expect.objectContaining({
          tradeModes: expect.arrayContaining(['buy', 'sell']),
        }),
      }),
    );
  });
});
