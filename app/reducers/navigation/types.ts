/**
 * Navigation state
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type NavigationState = {
  /**
   * Name of the currently-focused leaf route as reported by React Navigation's
   * `onStateChange`. `undefined` until the first navigation state is emitted
   * (i.e. before `NavigationContainer.onReady`) so consumers such as the
   * deeplink saga can distinguish "navigator not mounted yet" from any real
   * route. Previously hard-coded to `'WalletView'`, which caused the deeplink
   * pipeline to think the app was ready before any screen had mounted.
   */
  currentRoute: string | undefined;
  currentBottomNavRoute: string;
};
