import { createContext, useContext } from 'react';

import type { CardHeaderMode } from './hooks/useCardHeaderHandlers';

const CardEmbeddedContext = createContext(false);

/** Set when Card is shown from the Money footer, not pushed as its own screen. */
export const CardEmbeddedProvider = CardEmbeddedContext.Provider;

export const useIsCardEmbedded = (): boolean => useContext(CardEmbeddedContext);

/** The footer replaces Back. A pushed Card screen still has the arrow. */
export const getCardHomeHeaderMode = (embedded: boolean): CardHeaderMode =>
  embedded ? 'none' : 'back';
