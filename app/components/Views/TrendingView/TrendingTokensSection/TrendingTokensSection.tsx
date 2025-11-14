import React, { useCallback } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { TrendingAsset } from '@metamask/assets-controllers';
import TrendingTokensSkeleton from './TrendingTokenSkeleton/TrendingTokensSkeleton';
import TrendingTokensList from './TrendingTokensList';
import { useTrendingRequest } from '../../../UI/Assets/hooks/useTrendingRequest';
import SectionHeader from '../components/SectionHeader/SectionHeader';
import SectionCard from '../components/SectionCard/SectionCard';

const TrendingTokensSection = () => {
  const { results: trendingTokensResults, isLoading } = useTrendingRequest({});
  const trendingTokens = trendingTokensResults.slice(0, 3);

  const handleViewAll = useCallback(() => {
    // TODO: Implement view all logic
  }, []);

  const handleTokenPress = useCallback((token: TrendingAsset) => {
    // eslint-disable-next-line no-console
    console.log('🚀 ~ TrendingTokensSection ~ token:', token);
    // TODO: Implement token press logic
  }, []);

  return (
    <View>
      <SectionHeader
        title={strings('trending.tokens')}
        onViewAll={handleViewAll}
      />
      <SectionCard>
        {isLoading || trendingTokens.length === 0 ? (
          <TrendingTokensSkeleton count={3} />
        ) : (
          <TrendingTokensList
            trendingTokens={trendingTokens}
            onTokenPress={handleTokenPress}
          />
        )}
      </SectionCard>
    </View>
  );
};

export default TrendingTokensSection;
