import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

/**
 * Checks if a string looks like a URL.
 */
export function looksLikeUrl(str: string): boolean {
  return /^(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([/?].*)?$/.test(str);
}

/**
 * Builds a search engine URL for the given query.
 */
export function getSearchUrl(
  query: string,
  searchEngine: string | undefined,
): string {
  return searchEngine === 'DuckDuckGo'
    ? `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Navigates to the browser view with the given URL.
 */
export function navigateToBrowser(
  navigation: NavigationProp<ParamListBase>,
  url: string,
) {
  navigation.navigate(Routes.BROWSER.HOME, {
    screen: Routes.BROWSER.VIEW,
    params: {
      newTabUrl: url,
      timestamp: Date.now(),
      fromTrending: true,
    },
  });
}
