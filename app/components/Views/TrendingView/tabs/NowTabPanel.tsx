import React from 'react';
import { useNowSections } from '../sections.config';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';

export const NowTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useNowSections();
  return (
    <ExploreTabSectionedScroll
      {...props}
      sections={sections}
      scrollViewTestId={TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW}
    />
  );
};
