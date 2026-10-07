export const EXTERNAL_LINK_TYPE = 'external-link';

/** Discovery surface that opened a browser tab, carried onto its dapp analytics. */
export const BROWSER_ENTRY_POINT = {
  EXPLORE_SEARCH: 'explore_search',
} as const;

export type BrowserEntryPoint =
  (typeof BROWSER_ENTRY_POINT)[keyof typeof BROWSER_ENTRY_POINT];
