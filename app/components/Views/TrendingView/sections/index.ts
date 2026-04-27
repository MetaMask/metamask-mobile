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

export const useSearchSectionsArray = (): (SectionConfig & {
  id: SectionId;
})[] => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  return useMemo(() => {
    const next: (SectionConfig & { id: SectionId })[] = [
      SECTIONS_CONFIG.tokens,
    ];
    if (isPerpsEnabled) {
      next.push(SECTIONS_CONFIG.perps);
    }
    next.push(
      SECTIONS_CONFIG.stocks,
      SECTIONS_CONFIG.predictions,
      SECTIONS_CONFIG.sites,
    );
    return next;
  }, [isPerpsEnabled]);
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
