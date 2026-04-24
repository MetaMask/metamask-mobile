import React, { useMemo } from 'react';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';
import { useSelector } from 'react-redux';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { SectionConfig, SectionId, SECTIONS_CONFIG } from '../sections.config';

export const MacroTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const sections: (SectionConfig & { id: SectionId })[] = useMemo(() => {
    const next: (SectionConfig & { id: SectionId })[] = [];
    if (isPredictEnabled) {
      next.push(SECTIONS_CONFIG.politics_predictions);
    }
    if (isPerpsEnabled) {
      next.push(SECTIONS_CONFIG.macro_stocks_commodity_perps);
    }
    return next;
  }, [isPerpsEnabled, isPredictEnabled]);

  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
