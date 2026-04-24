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

export const CryptoTabPanel: React.FC<ExploreTabPanelProps> = (props) => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const sections: (SectionConfig & { id: SectionId })[] = useMemo(() => {
    const next: (SectionConfig & { id: SectionId })[] = [
      SECTIONS_CONFIG.tokens,
      SECTIONS_CONFIG.crypto_movers,
    ];
    if (isPerpsEnabled) {
      next.push(SECTIONS_CONFIG.crypto_perps);
    }
    next.push(SECTIONS_CONFIG.crypto_predictions);
    return next;
  }, [isPerpsEnabled]);

  return <ExploreTabSectionedScroll {...props} sections={sections} />;
};
