import React from 'react';
import SectionCard from '../components/SectionCard/SectionCard';

import { usePerpsMarkets } from '../../../UI/Perps/hooks';

const PerpsSection = () => {
  const { markets, isLoading } = usePerpsMarkets();
  const perpsTokens = markets.slice(0, 3);

  return (
    <SectionCard
      sectionId="perps"
      isLoading={isLoading || perpsTokens.length === 0}
      data={perpsTokens}
    />
  );
};

export default PerpsSection;
