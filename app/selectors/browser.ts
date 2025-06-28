import { SearchDiscoveryCategory } from '../components/UI/SearchDiscoveryResult/types';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

interface SiteItem {
    url: string;
    name: string;
}

export const selectBrowserHistoryWithType = createDeepEqualSelector(
    (state: RootState) => state.browser.history,
    (history: SiteItem[]) => history.map(item => ({...item, category: SearchDiscoveryCategory.Recents} as const)).reverse()
);

export const selectBrowserBookmarksWithType = createDeepEqualSelector(
    (state: RootState) => state.bookmarks,
    (bookmarks: SiteItem[]) => bookmarks.map(item => ({...item, category: SearchDiscoveryCategory.Favorites} as const))
);
