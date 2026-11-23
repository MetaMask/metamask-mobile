export const HOME_SEARCH_TRANSITION_DURATION = 220;

export interface HomepageSearchOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SearchOrigin = HomepageSearchOrigin;

export interface HomepageSearchReturnTransition {
  origin: SearchOrigin;
  showPastePill: boolean;
}

let pendingReturnTransition: HomepageSearchReturnTransition | undefined;
const returnTransitionListeners = new Set<
  (transition: HomepageSearchReturnTransition) => void
>();

export const scheduleHomepageSearchReturnTransition = (
  transition: HomepageSearchReturnTransition,
): void => {
  pendingReturnTransition = transition;
  returnTransitionListeners.forEach((listener) => listener(transition));
};

export const consumeHomepageSearchReturnTransition = ():
  | HomepageSearchReturnTransition
  | undefined => {
  const transition = pendingReturnTransition;
  pendingReturnTransition = undefined;
  return transition;
};

export const subscribeToHomepageSearchReturnTransition = (
  listener: (transition: HomepageSearchReturnTransition) => void,
): (() => void) => {
  returnTransitionListeners.add(listener);
  return () => returnTransitionListeners.delete(listener);
};
