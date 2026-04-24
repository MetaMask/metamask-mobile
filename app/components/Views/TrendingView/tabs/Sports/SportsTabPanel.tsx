import React, { useMemo } from 'react';
import {
  SECTIONS_CONFIG,
  type SectionConfig,
  type SectionId,
} from '../../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from '../ExploreTabSectionedScroll';

const useSportsSections = (): (SectionConfig & { id: SectionId })[] =>
  useMemo(() => [SECTIONS_CONFIG.sports_predictions], []);

export const SportsTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useSportsSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
