import React from 'react';
import { useCryptoSections } from '../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';

export const CryptoTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useCryptoSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
