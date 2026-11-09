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

const renderLivePrice = (initialPageActive: boolean) => {
  let isPageActive = initialPageActive;
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
  const setPageActive = (active: boolean) => {
    isPageActive = active;
    hook.rerender(undefined);
  };
  return { ...hook, store, context, unregister, setPageActive };
};

describe('useSocialLivePrice', () => {
  it('follows live prices after registering on an active page', () => {
    const { result, store, context } = renderLivePrice(true);

    act(() => store.publish('perp:BTC', 110));

    expect(context.register).toHaveBeenCalledWith(
      'card-1',
      'perp:BTC',
      result.current.trackRef,
    );
    expect(result.current.figures).not.toBeNull();
  });

  it('stays idle on an inactive page', () => {
    const { result, store, context } = renderLivePrice(false);

    act(() => store.publish('perp:BTC', 110));

    expect(context.register).not.toHaveBeenCalled();
    expect(result.current.figures).toBeNull();
  });

  it('updates the subscription across page activity changes', () => {
    const { result, store, context, unregister, setPageActive } =
      renderLivePrice(true);
    act(() => store.publish('perp:BTC', 110));
    expect(result.current.figures?.price).toBe(110);

    setPageActive(false);

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(result.current.figures).toBeNull();

    act(() => store.publish('perp:BTC', 120));
    expect(result.current.figures).toBeNull();

    setPageActive(true);

    expect(context.register).toHaveBeenCalledTimes(2);

    act(() => store.publish('perp:BTC', 130));
    expect(result.current.figures?.price).toBe(130);
  });
});
