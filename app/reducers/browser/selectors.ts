import { RootState } from '..';

export const selectBrowserState = (state: RootState) => state.browser;

export const selectBrowserHistory = (state: RootState) => state.browser.history;

/**
 * Gets the selected search engine from the Redux state
 * @param state - Redux state
 * @returns - Selected search engine
 */
export const selectSearchEngine = (state: RootState) =>
  state.settings.searchEngine;
