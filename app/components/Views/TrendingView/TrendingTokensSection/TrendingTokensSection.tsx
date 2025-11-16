import React, { useCallback } from 'react';
import { View } from 'react-native';
import { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokensSkeleton from './TrendingTokenSkeleton/TrendingTokensSkeleton';
import TrendingTokensList from './TrendingTokensList';
import { useTrendingRequest } from '../../../UI/Assets/hooks/useTrendingRequest';
import SectionHeader from '../components/SectionHeader/SectionHeader';
import SectionCard from '../components/SectionCard/SectionCard';
import { TimeOption } from '../TrendingTokensBottomSheet';

const TrendingTokensSection = () => {
  const { results: trendingTokensResults, isLoading } = useTrendingRequest({});
  const trendingTokens = trendingTokensResults.slice(0, 3);

  const handleTokenPress = useCallback((token: TrendingAsset) => {
    // eslint-disable-next-line no-console
    console.log('🚀 ~ TrendingTokensSection ~ token:', token);
    // TODO: Implement token press logic
  }, []);

  return (
    <View>
      <SectionHeader sectionId="tokens" />
      <SectionCard>
        {isLoading || trendingTokens.length === 0 ? (
          <TrendingTokensSkeleton count={3} />
        ) : (
          <TrendingTokensList
            trendingTokens={trendingTokens}
            onTokenPress={handleTokenPress}
            selectedTimeOption={TimeOption.TwentyFourHours}
          />
        )}
      </SectionCard>
    </View>
  );
};

export default TrendingTokensSection;
