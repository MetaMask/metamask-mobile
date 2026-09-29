/**
 * A deeplink target rendered as a tab inside the bottom `HOME_TABS` navigator
 * (e.g. Wallet, Rewards, Trending, Browser). `params` may use React
 * Navigation's nested `{ screen, params }` form to reach a screen within the
 * tab's own stack.
 */
export interface HomeTabDeeplinkNavigationTarget {
  type: 'home-tab';
  routeName: string;
  params?: object;
}

/**
 * A `MainNavigator` stack screen that sits above the bottom tabs
 * (e.g. Perps, Bridge, Predict, the RWA full view). The discriminant is the
 * only structural difference from a `home-tab` target; it changes how the
 * cold-start reset positions the route in the navigator hierarchy.
 *
 * `backTab` is the route name of the tab that should be active underneath this
 * screen (defaults to `WALLET.HOME`). Set it when pressing back from the screen
 * should land on a specific tab rather than the Wallet tab — e.g. the RWA
 * stocks view sets `TRENDING_VIEW` so back returns to Explore.
 */
export interface MainStackDeeplinkNavigationTarget {
  type: 'main-stack';
  routeName: string;
  params?: object;
  backTab?: string;
}

export interface DeeplinkIntent {
  target: HomeTabDeeplinkNavigationTarget | MainStackDeeplinkNavigationTarget;
  prepare?: () => void | Promise<void>;
}
