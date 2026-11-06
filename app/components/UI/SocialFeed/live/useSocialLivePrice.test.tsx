import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { TraderStatRotationContext } from '../components/TraderStatRotationContext';
import { SocialLivePricesContext } from './SocialLivePricesContext';
import { SocialLivePriceStore } from './SocialLivePriceStore';
import { useSocialLivePrice } from './useSocialLivePrice';
import type { SocialLivePriceSource } from './types';

const LIVE = { key: 'spot:asset-1' } as unknown as SocialLivePriceSource;

const setup = (isPageOnScreen: boolean) => {
  const unregister = jest.fn();
  const register = jest.fn(() => unregister);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SocialLivePricesContext.Provider
      value={{
        store: new SocialLivePriceStore(),
        register,
        requestVisibilityCheck: jest.fn(),
        reduceMotion: false,
      }}
    >
      <TraderStatRotationContext.Provider value={isPageOnScreen}>
        {children}
      </TraderStatRotationContext.Provider>
    </SocialLivePricesContext.Provider>
  );
  const hook = renderHook(() => useSocialLivePrice('card-1', LIVE), {
    wrapper,
  });
  return { register, unregister, ...hook };
};

describe('useSocialLivePrice page visibility', () => {
  it('registers the card for measuring when its page is on screen', () => {
    const { register } = setup(true);

    expect(register).toHaveBeenCalledTimes(1);
  });

  it('does not register a card on a page that is off screen', () => {
    const { register } = setup(false);

    expect(register).not.toHaveBeenCalled();
  });

  it('unregisters when the page leaves the screen', () => {
    const { unregister, unmount } = setup(true);

    unmount();

    expect(unregister).toHaveBeenCalledTimes(1);
  });
});
