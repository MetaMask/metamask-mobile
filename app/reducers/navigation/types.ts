/**
 * Navigation state
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type NavigationState = {
  /**
   * Name of the currently-focused leaf route. `undefined` until React
   * Navigation emits its first state, so consumers (e.g. the deeplink saga)
   * can distinguish "navigator not mounted yet" from a real route.
   */
  currentRoute: string | undefined;
  currentBottomNavRoute: string;
};
