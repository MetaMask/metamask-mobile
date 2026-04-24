import React, { useMemo } from 'react';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from '../ExploreTabSectionedScroll';
import { useSelector } from 'react-redux';
import { selectPredictEnabledFlag } from '../../../../UI/Predict';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import {
  SectionConfig,
  SectionId,
  SECTIONS_CONFIG,
} from '../../sections.config';

const useMacroSections = (): (SectionConfig & { id: SectionId })[] => {
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  return useMemo(() => {
    const sections: (SectionConfig & { id: SectionId })[] = [];
    if (isPredictEnabled) {
      sections.push(SECTIONS_CONFIG.politics_predictions);
    }
    if (isPerpsEnabled) {
      sections.push(SECTIONS_CONFIG.macro_stocks_commodity_perps);
    }
    return sections;
  }, [isPerpsEnabled, isPredictEnabled]);
};

export const MacroTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useMacroSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
