import { useSyncExternalStore } from 'react';

export type ContextualSection =
  | 'perps'
  | 'predict'
  | 'rewards'
  | 'collectibles';

export type ContextualTab =
  | 'explore'
  | 'live'
  | 'search'
  | 'portfolio'
  | 'earn'
  | 'claim'
  | 'performance'
  | 'popular'
  | 'packs'
  | 'collection'
  | 'market';

export interface ContextualNavState {
  section: ContextualSection | null;
  tab: ContextualTab;
}

const INITIAL_STATE: ContextualNavState = {
  section: null,
  tab: 'explore',
};

let state: ContextualNavState = INITIAL_STATE;
const listeners = new Set<() => void>();

const emit = (): void => {
  listeners.forEach((listener) => listener());
};

export const getContextualNavState = (): ContextualNavState => state;

export const subscribeContextualNav = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Perps section: footer becomes Explore, Live, Search, Portfolio, and Home. */
export const enterPerpsSection = (): void => {
  state = { section: 'perps', tab: 'explore' };
  emit();
};

/** Predictions section: the same footer, with Predict destinations. */
export const enterPredictSection = (): void => {
  state = { section: 'predict', tab: 'explore' };
  emit();
};

/** Rewards section: footer becomes Earn, Claim, Performance, and Settings. */
export const enterRewardsSection = (): void => {
  state = { section: 'rewards', tab: 'earn' };
  emit();
};

/** Collectibles section: footer becomes Popular, Packs, Collection, Market. */
export const enterCollectiblesSection = (): void => {
  state = { section: 'collectibles', tab: 'popular' };
  emit();
};

export const setContextualTab = (tab: ContextualTab): void => {
  if (state.section === null || state.tab === tab) {
    return;
  }
  state = { ...state, tab };
  emit();
};

/** Back to the default Home, Explore, Money, Social footer. */
export const exitContextualSection = (): void => {
  if (state.section === null && state.tab === 'explore') {
    return;
  }
  state = INITIAL_STATE;
  emit();
};

export const useContextualNavState = (): ContextualNavState =>
  useSyncExternalStore(
    subscribeContextualNav,
    getContextualNavState,
    getContextualNavState,
  );
