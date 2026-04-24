import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import {
  SectionConfig,
  SectionId,
  SECTIONS_CONFIG,
} from '../../sections.config';
import {
  ExploreTabSectionedScroll,
  type ExploreTabPanelProps,
} from '../ExploreTabSectionedScroll';

const useCryptoSections = (): (SectionConfig & { id: SectionId })[] => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  return useMemo(() => {
    const sections: (SectionConfig & { id: SectionId })[] = [
      SECTIONS_CONFIG.tokens,
      SECTIONS_CONFIG.crypto_movers,
    ];
    if (isPerpsEnabled) {
      sections.push(SECTIONS_CONFIG.crypto_perps);
    }
    sections.push(SECTIONS_CONFIG.crypto_predictions);
    return sections;
  }, [isPerpsEnabled]);
};

export const CryptoTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const sections = useCryptoSections();
  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
