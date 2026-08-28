import React from 'react';
import { act, renderHook } from '@testing-library/react-native';

import {
  SocialTradingProvider,
  useSocialTrading,
} from './SocialTradingContext';
import { MOCK_TRADES } from '../data/mockData';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SocialTradingProvider>{children}</SocialTradingProvider>
);

describe('SocialTradingContext', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useSocialTrading())).toThrow(
      'useSocialTrading must be used within SocialTradingProvider',
    );
  });

  it('toggles following a trader', () => {
    const { result } = renderHook(() => useSocialTrading(), { wrapper });

    expect(result.current.isFollowing('t2')).toBe(false);
    act(() => result.current.toggleFollow('t2'));
    expect(result.current.isFollowing('t2')).toBe(true);
    act(() => result.current.toggleFollow('t2'));
    expect(result.current.isFollowing('t2')).toBe(false);
  });

  it('toggles liking a trade', () => {
    const { result } = renderHook(() => useSocialTrading(), { wrapper });

    expect(result.current.isLiked('tr1')).toBe(false);
    act(() => result.current.toggleLike('tr1'));
    expect(result.current.isLiked('tr1')).toBe(true);
    act(() => result.current.toggleLike('tr1'));
    expect(result.current.isLiked('tr1')).toBe(false);
  });

  it('creates a simulated position when copying a trade', () => {
    const { result } = renderHook(() => useSocialTrading(), { wrapper });
    const trade = MOCK_TRADES[0];

    act(() => result.current.copyTrade(trade, 250));

    expect(result.current.positions).toHaveLength(1);
    const position = result.current.positions[0];
    expect(position).toMatchObject({
      tradeId: trade.id,
      traderId: trade.traderId,
      tokenSymbol: trade.tokenSymbol,
      side: trade.side,
      amountUsd: 250,
      entryPrice: trade.price,
    });
  });

  it('removes a simulated position when closed', () => {
    const { result } = renderHook(() => useSocialTrading(), { wrapper });

    act(() => result.current.copyTrade(MOCK_TRADES[0], 100));
    const positionId = result.current.positions[0].id;

    act(() => result.current.closePosition(positionId));
    expect(result.current.positions).toHaveLength(0);
  });
});
