import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';
import type { ExploreTabName } from './search/analytics';

const DEFAULT_ACTIVE_TAB: ExploreTabName = 'Now';

const ExploreActiveTabContext =
  createContext<ExploreTabName>(DEFAULT_ACTIVE_TAB);

export interface ExploreActiveTabProviderProps extends PropsWithChildren {
  activeTab: ExploreTabName;
}

/**
 * Exposes the currently active Explore tab to descendants without threading
 * it through `TabProps`. `TabsList` keeps every tab mounted simultaneously,
 * so passing the active tab as a prop would give all six tabs a changing
 * prop value on every switch, busting memoization for feeds that don't care
 * which tab is active. Consumers that do care (e.g. `PerpsBlock` pausing its
 * live subscription while hidden) read it via `useExploreActiveTab` instead.
 */
export const ExploreActiveTabProvider: React.FC<
  ExploreActiveTabProviderProps
> = ({ activeTab, children }) => (
  <ExploreActiveTabContext.Provider value={activeTab}>
    {children}
  </ExploreActiveTabContext.Provider>
);

/**
 * The currently active Explore tab name (e.g. `'Now'`, `'Macro'`). Falls
 * back to `'Now'` when rendered outside a provider, matching the tabs list's
 * default first tab.
 */
export const useExploreActiveTab = (): ExploreTabName =>
  useContext(ExploreActiveTabContext);
