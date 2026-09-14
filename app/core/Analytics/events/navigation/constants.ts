/** `action` sent on the Navigation Drawer event for every bottom nav item. */
export const BOTTOM_NAV_CLICKED_ACTION = 'bottom_nav_clicked';

/** `name` values for bottom nav items, snake_case and stable across variants. */
export enum BottomNavName {
  Home = 'home',
  Explore = 'explore',
  Browser = 'browser',
  Trade = 'trade',
  Money = 'money',
  Social = 'social',
  Activity = 'activity',
  Rewards = 'rewards',
  Settings = 'settings',
  Search = 'search',
}

/** Where a search field lives, for the Search Interacted event. */
export enum SearchInteractedSource {
  AccountList = 'account_list',
}

/**
 * `focused` is the field taking focus, which functionally opens search.
 * `searched` is a completed search: the query has settled and results show.
 */
export enum SearchInteractionType {
  Focused = 'focused',
  Searched = 'searched',
}
