import { createContext } from 'react';
import type { CollectiblesEntryDestination } from './types/navigation';

/** Retains the user's requested destination while the one-time introduction is shown. */
export const CollectiblesOnboardingContext = createContext<
  ((destination?: CollectiblesEntryDestination) => void) | undefined
>(undefined);
