import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../../UI/Predict';
import {
  SectionConfig,
  SectionId,
  SECTIONS_CONFIG,
} from '../../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from '../ExploreTabSectionedScroll';

const useRwasSections = (): (SectionConfig & { id: SectionId })[] => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  return useMemo(() => {
    const sections: (SectionConfig & { id: SectionId })[] = [
      SECTIONS_CONFIG.stocks,
    ];
    if (isPredictEnabled) {
      sections.push(SECTIONS_CONFIG.politics_predictions);
    }
    if (isPerpsEnabled) {
      sections.push(SECTIONS_CONFIG.rwa_perps);
    }
    return sections;
  }, [isPerpsEnabled, isPredictEnabled]);
};

export const RwasTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useRwasSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
