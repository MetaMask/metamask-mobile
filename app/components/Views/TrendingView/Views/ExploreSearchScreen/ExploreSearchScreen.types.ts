import type { SearchEntryPoint } from '../../search/analytics';

export interface ExploreSearchRouteParams {
  /** Prefills the search input (e.g. from a deeplink). */
  initialQuery?: string;
  /** Attributes Search opens initiated outside its in-app tap handlers. */
  entryPoint?: SearchEntryPoint;
  /** Header search field bounds used for the home-to-search handoff. */
  searchOrigin?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Keeps the homepage Paste pill visible during the initial handoff. */
  pastePillVisible?: boolean;
}

export const getTrimmedInitialQuery = (initialQuery: unknown): string =>
  typeof initialQuery === 'string' ? initialQuery.trim() : '';
