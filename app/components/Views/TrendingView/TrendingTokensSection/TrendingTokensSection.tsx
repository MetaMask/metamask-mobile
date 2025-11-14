import React from 'react';
import { useTrendingRequest } from '../../../UI/Assets/hooks/useTrendingRequest';
import SectionCard from '../components/SectionCard/SectionCard';

const TrendingTokensSection = () => {
  const { results: trendingTokensResults, isLoading } = useTrendingRequest({});
  const trendingTokens = trendingTokensResults.slice(0, 3);

  return (
    <SectionCard
      sectionId="tokens"
      isLoading={isLoading || trendingTokens.length === 0}
      data={trendingTokens}
    />
  );
};

export default TrendingTokensSection;
