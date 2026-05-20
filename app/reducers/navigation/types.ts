/**
 * Navigation state
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type NavigationState = {
  currentRoute: string;
  currentBottomNavRoute: string;
  /**
   * Sticky flag flipped to `true` once `MainNavigator` has mounted (i.e.
   * post-login deeplink target screens are registered with React Navigation).
   * Never resets; if the user logs out we tear the whole store anyway.
   */
  isMainNavigatorReady: boolean;
};
