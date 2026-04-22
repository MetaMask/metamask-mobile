import React from 'react';
import { useSportsSections } from '../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';

export const SportsTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useSportsSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
