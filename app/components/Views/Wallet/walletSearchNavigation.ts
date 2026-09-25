import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { trackExploreSearchOpened } from '../TrendingView/search/analytics';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SearchOrigin } from '../TrendingView/search/useHomepageSearchPaste';

export const navigateToExploreSearch = (
  navigation: AppNavigationProp,
  isSearchHeaderEnabled: boolean,
  initialQuery?: string,
  searchOrigin?: SearchOrigin,
  pastePillVisible?: boolean,
) => {
  if (!isSearchHeaderEnabled) {
    trackExploreSearchOpened('home');
    navigation.navigate(Routes.EXPLORE_SEARCH);
    return;
  }

  navigation.navigate(Routes.EXPLORE_SEARCH, {
    entryPoint: 'home',
    ...(initialQuery ? { initialQuery } : {}),
    ...(searchOrigin ? { searchOrigin } : {}),
    ...(pastePillVisible ? { pastePillVisible } : {}),
  });
};
