import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

interface SiteItem {
    url: string;
    name: string;
}

export const selectBrowserHistoryWithType = createDeepEqualSelector(
    (state: RootState) => state.browser.history,
    (history: SiteItem[]) => history.map(item => ({...item, type: 'recents'})).reverse()
);

export const selectBrowserBookmarksWithType = createDeepEqualSelector(
    (state: RootState) => state.bookmarks,
    (bookmarks: SiteItem[]) => bookmarks.map(item => ({...item, type: 'favorites'}))
);