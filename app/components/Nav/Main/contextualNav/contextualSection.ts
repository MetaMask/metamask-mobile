import { useSyncExternalStore } from 'react';

export type ContextualSection =
  | 'perps'
  | 'predict'
  | 'rewards'
  | 'collectibles'
  | 'money'
  | 'explore'
  | 'trading';

export type TradingHubTab = 'swap' | 'perps' | 'predictions';

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
  | 'market'
  | 'account'
  | 'payments'
  | 'card'
  | 'news'
  | 'browser'
  | TradingHubTab;

/** Round button beside the pill. + on Home, Home in every section. */
export type ContextualCircleAction = 'add' | 'home';

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

/**
 * Collectibles section, opened from the default footer.
 * Footer is Popular, Packs, Collection, and Market. Home sits beside the pill.
 */
export const enterCollectiblesSection = (): void => {
  state = { section: 'collectibles', tab: 'popular' };
  emit();
};

/** Money section. Footer is Account, Card, and Earn. Home sits beside the pill. */
export const enterMoneySection = (): void => {
  if (state.section === 'money') {
    return;
  }
  state = { section: 'money', tab: 'account' };
  emit();
};

/**
 * Trade landing. Explore is selected and the trade overview is showing.
 * Also used when Explore is pressed from Swap, Perps, or Predictions.
 */
export const enterTradeExplore = (): void => {
  if (state.section === 'trading' && state.tab === 'explore') {
    return;
  }
  state = { section: 'trading', tab: 'explore' };
  emit();
};

/**
 * Trade tab. Footer is Explore, Swap, Perps, and Predictions.
 * Explore is selected. Does not reset a hub that is already open.
 */
export const enterTradeDashboard = (): void => {
  if (state.section === 'trading') {
    return;
  }
  state = { section: 'trading', tab: 'explore' };
  emit();
};

/**
 * Trading hub. The same trade footer, with `tab` selected. It does not list
 * sub-sections of a hub.
 */
export const enterTradingHub = (tab: TradingHubTab): void => {
  if (state.section === 'trading' && state.tab === tab) {
    return;
  }
  state = { section: 'trading', tab };
  emit();
};

/** True while Swap, Perps, or Predictions is the open trade footer destination. */
export const isTradingHub = (
  nav: ContextualNavState,
  hub: TradingHubTab,
): boolean => nav.section === 'trading' && nav.tab === hub;

/** Explore section: footer becomes Explore, News, Browser, and Search. */
export const enterExploreSection = (): void => {
  state = { section: 'explore', tab: 'explore' };
  emit();
};

/** Sections opened from the + menu. Collectibles is a default-footer tab. */
export const isPlusMenuSection = (section: ContextualSection | null): boolean =>
  section === 'perps' || section === 'predict' || section === 'rewards';

/** + when no section is open. Home once a section footer is showing. */
export const getContextualCircleAction = (
  section: ContextualSection | null,
): ContextualCircleAction => (section === null ? 'add' : 'home');

export const setContextualTab = (tab: ContextualTab): void => {
  if (state.section === null || state.tab === tab) {
    return;
  }
  state = { ...state, tab };
  emit();
};

/** Back to the default Home, Trending, Trade, Collectibles, Money, Social footer. */
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

export const useIsTradingHub = (hub: TradingHubTab): boolean =>
  isTradingHub(useContextualNavState(), hub);
