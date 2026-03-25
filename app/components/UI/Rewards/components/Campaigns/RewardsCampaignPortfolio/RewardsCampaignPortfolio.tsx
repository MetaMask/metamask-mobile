import React, { useCallback } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Skeleton,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TrendingTokenLogo from '../../../../Trending/components/TrendingTokenLogo';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { useCampaignPortfolio } from '../../../hooks/useCampaignPortfolio';
import { strings } from '../../../../../../../locales/i18n';
import type { CampaignPortfolioPositionDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';

const testIds = {
  CONTAINER: 'rewards-campaign-portfolio-container',
  LOADING_SKELETON: 'rewards-campaign-portfolio-loading-skeleton',
  ERROR_CONTAINER: 'rewards-campaign-portfolio-error-container',
  ERROR_BANNER: 'rewards-campaign-portfolio-error-banner',
  EMPTY_STATE: 'rewards-campaign-portfolio-empty-state',
  POSITION_ROW: 'rewards-campaign-portfolio-position-row',
} as const;

interface RewardsCampaignPortfolioProps {
  campaignId: string;
}

const SKELETON_ITEM_COUNT = 3;

const PortfolioPositionRow: React.FC<{
  position: CampaignPortfolioPositionDto;
}> = ({ position }) => {
  const assetId = position.tokenAddresses[0] ?? '';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="py-3 px-4"
      testID={testIds.POSITION_ROW}
    >
      <TrendingTokenLogo
        assetId={assetId}
        symbol={position.tokenSymbol}
        size={40}
      />
      <Box twClassName="ml-3 flex-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {position.tokenName}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="text-muted">
          {position.tokenSymbol}
        </Text>
      </Box>
      <Box twClassName="items-end">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          ${position.currentValue}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          twClassName={
            parseFloat(position.unrealizedPnl) >= 0
              ? 'text-success-default'
              : 'text-error-default'
          }
        >
          {parseFloat(position.unrealizedPnl) >= 0 ? '+' : ''}
          {position.unrealizedPnlPercent}%
        </Text>
      </Box>
    </Box>
  );
};

const SkeletonRow: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="py-3 px-4"
    >
      <Skeleton style={tw.style('w-10 h-10 rounded-full')} />
      <Box twClassName="ml-3 flex-1 gap-1">
        <Skeleton style={tw.style('w-24 h-4 rounded')} />
        <Skeleton style={tw.style('w-16 h-3 rounded')} />
      </Box>
      <Box twClassName="items-end gap-1">
        <Skeleton style={tw.style('w-16 h-4 rounded')} />
        <Skeleton style={tw.style('w-12 h-3 rounded')} />
      </Box>
    </Box>
  );
};

const LoadingSkeleton: React.FC = () => (
  <Box testID={testIds.LOADING_SKELETON}>
    {Array.from({ length: SKELETON_ITEM_COUNT }).map((_, index) => (
      <SkeletonRow key={`skeleton-${index}`} />
    ))}
  </Box>
);

const EmptyState: React.FC = () => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="py-8 px-4"
    testID={testIds.EMPTY_STATE}
  >
    <Text variant={TextVariant.BodyMd} twClassName="text-muted text-center">
      {strings('rewards.campaign_portfolio.empty_state')}
    </Text>
  </Box>
);

const RewardsCampaignPortfolio = ({
  campaignId,
}: RewardsCampaignPortfolioProps) => {
  const { portfolio, isLoading, hasError, refetch } =
    useCampaignPortfolio(campaignId);

  const renderItem: ListRenderItem<CampaignPortfolioPositionDto> = useCallback(
    ({ item }) => <PortfolioPositionRow position={item} />,
    [],
  );

  const keyExtractor = useCallback(
    (item: CampaignPortfolioPositionDto) =>
      item.tokenAddresses[0] ?? item.tokenSymbol,
    [],
  );

  if (isLoading && !portfolio) {
    return <LoadingSkeleton />;
  }

  if (hasError && !portfolio) {
    return (
      <Box twClassName="px-4 py-4" testID={testIds.ERROR_CONTAINER}>
        <RewardsErrorBanner
          title={strings('rewards.campaign_portfolio.error_title')}
          description={strings('rewards.campaign_portfolio.error_description')}
          onConfirm={refetch}
          confirmButtonLabel={strings('rewards.campaign_portfolio.retry')}
          testID={testIds.ERROR_BANNER}
        />
      </Box>
    );
  }

  const positions = portfolio?.positions ?? [];

  if (positions.length === 0) {
    return <EmptyState />;
  }

  return (
    <Box testID={testIds.CONTAINER}>
      <FlatList
        data={positions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </Box>
  );
};

RewardsCampaignPortfolio.testIds = testIds;

export default RewardsCampaignPortfolio;
