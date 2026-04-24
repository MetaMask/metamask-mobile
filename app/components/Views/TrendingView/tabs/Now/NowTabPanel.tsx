import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import {
  buildSections,
  DEFAULT_HOME_ORDER,
  SectionConfig,
  SectionId,
} from '../../sections.config';
import { TrendingViewSelectorsIDs } from '../../TrendingView.testIds';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from '../ExploreTabSectionedScroll';

const useNowSections = (): (SectionConfig & { id: SectionId })[] => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  return useMemo(
    () => buildSections(DEFAULT_HOME_ORDER, isPerpsEnabled),
    [isPerpsEnabled],
  );
};

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
