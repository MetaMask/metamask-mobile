import { UrlAutocompleteCategory } from '../components/UI/UrlAutocomplete';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

interface SiteItem {
    url: string;
    name: string;
}

export const selectBrowserHistoryWithType = createDeepEqualSelector(
    (state: RootState) => state.browser.history,
    (history: SiteItem[]) => history.map(item => ({...item, category: UrlAutocompleteCategory.Recents} as const)).reverse()
);

export const selectBrowserBookmarksWithType = createDeepEqualSelector(
    (state: RootState) => state.bookmarks,
    (bookmarks: SiteItem[]) => bookmarks.map(item => ({...item, category: UrlAutocompleteCategory.Favorites} as const))
);
