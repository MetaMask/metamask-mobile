import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import { SocialFeedPageActiveContext } from '../components/SocialFeedPageActiveContext';
import {
  SocialLivePricesContext,
  type SocialLivePricesContextValue,
} from './SocialLivePricesContext';
import { SocialLivePriceStore } from './SocialLivePriceStore';
import type { SocialLivePriceSource } from './types';
import { useSocialLivePrice } from './useSocialLivePrice';

const live: SocialLivePriceSource = {
  key: 'perp:BTC',
  kind: 'perp',
  symbol: 'BTC',
  positionAmount: 1,
  direction: 1,
  snapshotPrice: 100,
  snapshotPnlUsd: 0,
  entryPrice: 100,
  pnlBaseUsd: 100,
  marketCapPerPrice: null,
};

const renderLivePrice = (isPageActive: boolean) => {
  const store = new SocialLivePriceStore(0);
  const unregister = jest.fn();
  const context: SocialLivePricesContextValue = {
    store,
    register: jest.fn(() => unregister),
    requestVisibilityCheck: jest.fn(),
    reduceMotion: false,
  };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SocialLivePricesContext.Provider value={context}>
      <SocialFeedPageActiveContext.Provider value={isPageActive}>
        {children}
      </SocialFeedPageActiveContext.Provider>
    </SocialLivePricesContext.Provider>
  );
  const hook = renderHook(() => useSocialLivePrice('card-1', live), {
    wrapper,
  });
  return { ...hook, store, context };
};

describe('useSocialLivePrice', () => {
  it('registers the card and follows its price on an active page', () => {
    const { result, store, context } = renderLivePrice(true);

    act(() => store.publish('perp:BTC', 110));

    expect(context.register).toHaveBeenCalledWith(
      'card-1',
      'perp:BTC',
      result.current.trackRef,
    );
    expect(result.current.figures).not.toBeNull();
  });

  it('neither registers nor follows the price on an inactive page', () => {
    const { result, store, context } = renderLivePrice(false);

    act(() => store.publish('perp:BTC', 110));

    expect(context.register).not.toHaveBeenCalled();
    expect(result.current.figures).toBeNull();
  });
});
