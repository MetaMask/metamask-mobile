import React, { forwardRef } from 'react';
import type { SectionRefreshHandle } from '../../../../Views/Homepage/types';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import EarnSection from '../../../../UI/Earn/components/EarnSection';
import { useIsFocused } from '@react-navigation/native';

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
>(({ sectionIndex, totalSectionsLoaded, showDividers }, ref) => {
  const isFocused = useIsFocused();

  return (
    <EarnSection
      ref={ref}
      tokenDetailsSource={TokenDetailsSource.HomeSection}
      homeAnalytics={{ sectionIndex, totalSectionsLoaded }}
      showDividers={showDividers}
      enabled={isFocused}
    />
  );
});

export default React.memo(HomepageEarnSection);
