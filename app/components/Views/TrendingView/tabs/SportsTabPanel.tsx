import React from 'react';
import { SECTIONS_CONFIG } from '../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';

export const SportsTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = [SECTIONS_CONFIG.sports_predictions];
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
