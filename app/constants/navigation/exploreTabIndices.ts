export const EXPLORE_TAB_INDEX = {
  NOW: 0,
  MACRO: 1,
  RWAS: 2,
  CRYPTO: 3,
  SPORTS: 4,
  SITES: 5,
} as const;

export type ExploreTabIndex =
  (typeof EXPLORE_TAB_INDEX)[keyof typeof EXPLORE_TAB_INDEX];
