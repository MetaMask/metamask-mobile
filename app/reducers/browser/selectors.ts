import { RootState } from '..';

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

export const selectBrowserTabs = (state: RootState) => state.browser.tabs;
