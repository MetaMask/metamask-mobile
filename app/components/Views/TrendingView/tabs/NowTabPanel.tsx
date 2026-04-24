import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import {
  buildSections,
  DEFAULT_HOME_ORDER,
  SectionConfig,
  SectionId,
} from '../sections.config';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';

export const NowTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const sections: (SectionConfig & { id: SectionId })[] = useMemo(
    () => buildSections(DEFAULT_HOME_ORDER, isPerpsEnabled),
    [isPerpsEnabled],
  );

  return (
    <ExploreTabSectionedScroll
      {...props}
      sections={sections}
      scrollViewTestId={TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW}
    />
  );
};
