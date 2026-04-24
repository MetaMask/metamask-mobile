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

const useDappsSections = (): (SectionConfig & { id: SectionId })[] =>
  useMemo(() => [SECTIONS_CONFIG.dapps_recents, SECTIONS_CONFIG.sites], []);

export const DappsTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useDappsSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
