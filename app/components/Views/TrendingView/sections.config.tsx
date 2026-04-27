/**
 * Re-export barrel — all section logic has been split into focused files under sections/.
 * This file exists only to preserve existing import paths across the codebase.
 */
export {
  SECTIONS_CONFIG,
  DEFAULT_HOME_ORDER,
  DEFAULT_SEARCH_ORDER,
  buildSections,
  useSearchSectionsArray,
} from './sections/index';

export type {
  SectionId,
  SectionConfig,
  SectionIcon,
  SectionData,
  ExploreTabId,
  RowItemProps,
  RowItemSearchProps,
} from './sections/types';

export {
  fuseSearch,
  TOKEN_FUSE_OPTIONS,
  PERPS_FUSE_OPTIONS,
  PREDICTIONS_FUSE_OPTIONS,
  DEFAULT_TOKENS_FILTER_CONTEXT,
  SEARCH_TOKENS_FILTER_CONTEXT,
  CRYPTO_MOVERS_SEARCH_FILTER_CONTEXT,
  CRYPTO_MOVERS_HOME_FILTER_CONTEXT,
} from './sections/search-utils';
