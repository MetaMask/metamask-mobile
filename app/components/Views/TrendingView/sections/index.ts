import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { tokensSections } from './tokens.sections';
import { perpsSections } from './perps.sections';
import { predictionsSections } from './predictions.sections';
import { sitesSections } from './sites.sections';
import type { SectionConfig, SectionId } from './types';

export const SECTIONS_CONFIG: Record<SectionId, SectionConfig> = {
  ...tokensSections,
  ...perpsSections,
  ...predictionsSections,
  ...sitesSections,
};

export const DEFAULT_HOME_ORDER: SectionId[] = [
  'predictions',
  'tokens',
  'crypto_movers',
  'perps',
  'stocks',
];

/** Section order for Explore omni-search (see `useExploreSearchSectionsData` in useExploreSearch.ts). */
export const DEFAULT_SEARCH_ORDER: SectionId[] = [
  'tokens',
  'perps',
  'stocks',
  'predictions',
  'sites',
];

export const buildSections = (
  order: SectionId[],
  isPerpsEnabled: boolean,
): (SectionConfig & { id: SectionId })[] =>
  order
    .filter((id) => isPerpsEnabled || id !== 'perps')
    .map((id) => SECTIONS_CONFIG[id]);

export const useSearchSectionsArray = (): (SectionConfig & {
  id: SectionId;
})[] => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  return useMemo(
    () => buildSections(DEFAULT_SEARCH_ORDER, isPerpsEnabled),
    [isPerpsEnabled],
  );
};

// Re-export types for consumers that import from sections.config
export type {
  SectionId,
  SectionConfig,
  SectionIcon,
  SectionData,
  ExploreTabId,
} from './types';
export {
  fuseSearch,
  TOKEN_FUSE_OPTIONS,
  PERPS_FUSE_OPTIONS,
  PREDICTIONS_FUSE_OPTIONS,
} from './search-utils';
