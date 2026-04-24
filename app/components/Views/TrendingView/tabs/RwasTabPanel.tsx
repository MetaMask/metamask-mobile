import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import { SectionConfig, SectionId, SECTIONS_CONFIG } from '../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from './ExploreTabSectionedScroll';

export const RwasTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const sections: (SectionConfig & { id: SectionId })[] = useMemo(() => {
    const next: (SectionConfig & { id: SectionId })[] = [
      SECTIONS_CONFIG.stocks,
    ];
    if (isPredictEnabled) {
      next.push(SECTIONS_CONFIG.politics_predictions);
    }
    if (isPerpsEnabled) {
      next.push(SECTIONS_CONFIG.rwa_perps);
    }
    return next;
  }, [isPerpsEnabled, isPredictEnabled]);

  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
