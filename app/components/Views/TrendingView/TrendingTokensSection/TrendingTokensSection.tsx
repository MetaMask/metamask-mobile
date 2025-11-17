import React from 'react';
import { View } from 'react-native';
import TrendingTokensSkeleton from './TrendingTokenSkeleton/TrendingTokensSkeleton';
import TrendingTokensList from './TrendingTokensList';
import { useTrendingRequest } from '../../../UI/Assets/hooks/useTrendingRequest';
import SectionHeader from '../components/SectionHeader/SectionHeader';
import SectionCard from '../components/SectionCard/SectionCard';
import { TimeOption } from '../TrendingTokensBottomSheet';

const TrendingTokensSection = () => {
  const { results: trendingTokensResults, isLoading } = useTrendingRequest({});
  const trendingTokens = trendingTokensResults.slice(0, 3);

  return (
    <View>
      <SectionHeader sectionId="tokens" />
      <SectionCard>
        {isLoading || trendingTokens.length === 0 ? (
          <TrendingTokensSkeleton count={3} />
        ) : (
          <TrendingTokensList
            trendingTokens={trendingTokens}
            selectedTimeOption={TimeOption.TwentyFourHours}
          />
        )}
      </SectionCard>
    </View>
  );
};

export default TrendingTokensSection;
