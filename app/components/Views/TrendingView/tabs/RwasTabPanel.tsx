import React from 'react';
import { useRwasSections } from '../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';

export const RwasTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useRwasSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
