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
  TOP_TRADERS_QUICK_BUY_FEATURES: { tradeModes: ['buy'] },
}));

jest.mock('./types', () => ({
  positionToQuickBuyTarget: (p: Position) => ({
    tokenAddress: p.tokenAddress,
    tokenSymbol: p.tokenSymbol,
    tokenName: p.tokenName,
    chain: p.chain,
  }),
}));

const mockPosition: Position = {
  tokenAddress: '0xtoken',
  tokenSymbol: 'TKN',
  tokenName: 'Token',
  chain: '0x1',
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

  it('maps position to QuickBuyTarget', () => {
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
          chain: '0x1',
        },
      }),
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
        source="leaderboard"
      />,
    );
    expect(mockQuickBuyRoot).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsContext: {
          traderAddress: '0xtrader',
          marketCap: 1000000,
          source: 'leaderboard',
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
});
