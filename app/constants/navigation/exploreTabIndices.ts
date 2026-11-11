export const EXPLORE_TAB_INDEX = {
  NOW: 0,
  CRYPTO: 1,
  PERPS: 2,
  MACRO: 2,
  RWAS: 3,
  SPORTS: 4,
  SITES: 5,
} as const;

export type ExploreTabIndex =
  (typeof EXPLORE_TAB_INDEX)[keyof typeof EXPLORE_TAB_INDEX];
