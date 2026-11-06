import { createContext, useContext } from 'react';

const EarnEmbeddedContext = createContext(false);

/** Set when Earn is shown from the Money footer, not pushed as its own screen. */
export const EarnEmbeddedProvider = EarnEmbeddedContext.Provider;

export const useIsEarnEmbedded = (): boolean => useContext(EarnEmbeddedContext);

/** The footer replaces Back. A pushed Earn screen still has the arrow. */
export const showEarnListBackButton = (embedded: boolean): boolean => !embedded;
