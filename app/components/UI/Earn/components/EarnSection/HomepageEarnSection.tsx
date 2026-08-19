import React, { forwardRef } from 'react';
import type { SectionRefreshHandle } from '../../../../Views/Homepage/types';
import EarnSection from './EarnSection';

interface HomepageEarnSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  showDividers?: boolean;
}

/**
 * Homepage adapter for EarnSection.
 *
 * EarnSection is shared with Explore, where Homepage section metadata does not
 * apply. Keeping this wrapper preserves required analytics props for Homepage
 * callers without making the shared component's Explore contract ambiguous.
 */
const HomepageEarnSection = forwardRef<
  SectionRefreshHandle,
  HomepageEarnSectionProps
>(({ sectionIndex, totalSectionsLoaded, showDividers }, ref) => (
  <EarnSection
    ref={ref}
    homeAnalytics={{ sectionIndex, totalSectionsLoaded }}
    showDividers={showDividers}
  />
));

export default React.memo(HomepageEarnSection);
