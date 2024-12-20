import { RootState } from '..';

export const selectBrowserHistory = (state: RootState) => state.browser.history;
