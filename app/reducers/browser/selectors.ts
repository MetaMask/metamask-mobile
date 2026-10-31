import { RootState } from '..';
import { getHost } from '../../util/browser';
import type { BrowserEntryPoint } from '../../constants/browser';
import type { BrowserTab } from '../../components/Views/Browser/Browser.types';

export const selectBrowserHistory = (state: RootState) => state.browser.history;

/**
 * Gets the selected search engine from the Redux state
 * @param state - Redux state
 * @returns - Selected search engine
 */
export const selectSearchEngine = (state: RootState) =>
  state.settings.searchEngine;

/**
 * Gets the number of browser tabs from the Redux state
 * @param state - Redux state
 * @returns - Number of browser tabs
 */
export const selectBrowserTabCount = (state: RootState) =>
  state.browser.tabs.length;

/**
 * Gets the active tab's entry point when the tab is currently showing `origin`.
 * Keeps dapp and connect events from claiming a discovery surface for a
 * request that did not come from the tab that surface opened.
 * @param state - Redux state
 * @param origin - Hostname or URL of the dapp the event is about
 * @returns - The active tab's entry point, if any
 */
export const selectActiveTabEntryPointForOrigin = (
  state: Pick<RootState, 'browser'>,
  origin: string,
): BrowserEntryPoint | undefined => {
  const tabs: BrowserTab[] = state.browser.tabs;
  const tab = tabs.find(({ id }) => id === state.browser.activeTab);
  if (!tab?.entryPoint || !tab.url) {
    return undefined;
  }
  return getHost(tab.url) === getHost(origin) ? tab.entryPoint : undefined;
};
