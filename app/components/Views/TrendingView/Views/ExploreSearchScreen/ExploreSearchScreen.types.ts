import type { SearchEntryPoint } from '../../search/analytics';

export interface ExploreSearchRouteParams {
  /** Prefills the search input (e.g. from a deeplink). */
  initialQuery?: string;
  /** Attributes Search opens initiated outside its in-app tap handlers. */
  entryPoint?: SearchEntryPoint;
}
