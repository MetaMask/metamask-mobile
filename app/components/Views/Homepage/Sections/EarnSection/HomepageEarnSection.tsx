import React, { forwardRef } from 'react';
import type { SectionRefreshHandle } from '../../../../Views/Homepage/types';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import EarnSection from '../../../../UI/Earn/components/EarnSection';
import { useIsFocused } from '@react-navigation/native';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_SCREEN_NAMES,
} from '../../../../UI/Earn/constants/earnModuleEvents';
import type { EarnModuleSurfaceLocation } from '../../../../UI/Earn/types/earnModuleEvents.types';

interface HomepageEarnSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  showDividers?: boolean;
}

const HOMEPAGE_EARN_ANALYTICS_CONTEXT: EarnModuleSurfaceLocation = {
  screen_name: EARN_MODULE_SCREEN_NAMES.WALLET_HOME,
  entry_point: EARN_MODULE_ENTRY_POINTS.HOMEPAGE,
  component_name: EARN_MODULE_COMPONENT_NAMES.HOMEPAGE_EARN_SECTION,
};

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
      analyticsContext={HOMEPAGE_EARN_ANALYTICS_CONTEXT}
      homeAnalytics={{ sectionIndex, totalSectionsLoaded }}
      showDividers={showDividers}
      enabled={isFocused}
    />
  );
});

export default React.memo(HomepageEarnSection);
