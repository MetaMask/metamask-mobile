import React from 'react';
import { useMacroSections } from '../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';

export const MacroTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useMacroSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
