import React from 'react';
import { SECTIONS_CONFIG } from '../../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from '../ExploreTabSectionedScroll';

export const DappsTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = [SECTIONS_CONFIG.dapps_recents, SECTIONS_CONFIG.sites];
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
