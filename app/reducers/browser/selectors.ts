import { RootState } from '..';

export const selectBrowserHistory = (state: RootState) => state.browser.history;

/**
 * Gets the selected search engine from the Redux state
 * @param state - Redux state
 * @returns - Selected search engine
 */
export const selectSearchEngine = (state: RootState) =>
  state.settings.searchEngine;

export const selectBrowserTabs = (state: RootState) => state.browser.tabs;

export const selectBrowserActiveTabId = (state: RootState) =>
  state.browser.activeTab;
