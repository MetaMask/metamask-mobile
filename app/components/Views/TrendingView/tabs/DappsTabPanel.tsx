import React from 'react';
import { useDappsSections } from '../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';

export const DappsTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useDappsSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
