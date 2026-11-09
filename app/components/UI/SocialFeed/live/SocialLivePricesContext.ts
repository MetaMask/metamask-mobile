import { createContext, useContext, type RefObject } from 'react';
import type { View } from 'react-native';
import type { SocialLivePriceStore } from './SocialLivePriceStore';
import type { SocialLivePriceKey } from './types';

export interface SocialLivePricesContextValue {
  store: SocialLivePriceStore;
  /**
   * Tracks a card so its asset is streamed while the card is on screen.
   * Returns the matching unregister.
   */
  register: (
    id: string,
    key: SocialLivePriceKey,
    ref: RefObject<View | null>,
  ) => () => void;
  /**
   * Re-measures which tracked cards are on screen. Call when a list settles
   * after scrolling or a page changes; `delayMs` lets a page transition finish
   * first.
   */
  requestVisibilityCheck: (delayMs?: number) => void;
  /** Low-end hardware: swap figures without the digit roll. */
  reduceMotion: boolean;
}

export const SocialLivePricesContext =
  createContext<SocialLivePricesContextValue | null>(null);

/** `null` outside `SocialLivePricesProvider`, where cards keep their snapshot. */
export const useSocialLivePrices = (): SocialLivePricesContextValue | null =>
  useContext(SocialLivePricesContext);
