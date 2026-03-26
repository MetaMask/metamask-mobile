import React, { useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import formatFiat from '../../../../../util/formatFiat';
import TrendingTokenLogo from '../../../Trending/components/TrendingTokenLogo';
import { useGetOndoCampaignPortfolioPosition } from '../../hooks/useGetOndoCampaignPortfolioPosition';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { groupPortfolioPositionsByAsset } from './OndoCampaignPortfolio.utils';
import { formatComputedAt } from './OndoLeaderboard.utils';

export const ONDO_CAMPAIGN_PORTFOLIO_SNIPPET_TEST_IDS = {
  CONTAINER: 'ondo-campaign-portfolio-snippet-container',
  LOADING: 'ondo-campaign-portfolio-snippet-loading',
  ERROR: 'ondo-campaign-portfolio-snippet-error',
  EMPTY: 'ondo-campaign-portfolio-snippet-empty',
} as const;

const formatUsd = (value: string): string => {
  try {
    return formatFiat(new BigNumber(value), 'USD');
  } catch {
    return value;
  }
};

interface OndoCampaignPortfolioSnippetProps {
  campaignId: string;
}

const OndoCampaignPortfolioSnippet: React.FC<
  OndoCampaignPortfolioSnippetProps
> = ({ campaignId }) => {
  const tw = useTailwind();
  const { portfolio, isLoading, hasError, hasFetched, refetch } =
    useGetOndoCampaignPortfolioPosition(campaignId);

  const grouped = useMemo(
    () =>
      portfolio ? groupPortfolioPositionsByAsset(portfolio.positions) : [],
    [portfolio],
  );
  const previewRows = grouped.slice(0, 2);

  const showSkeleton = isLoading && !hasFetched;

  if (hasError) {
    return (
      <Box
        twClassName="gap-3"
        testID={ONDO_CAMPAIGN_PORTFOLIO_SNIPPET_TEST_IDS.ERROR}
      >
        <RewardsErrorBanner
          title={strings('rewards.ondo_campaign_portfolio.error_loading')}
          description={strings(
            'rewards.ondo_campaign_portfolio.error_loading_description',
          )}
          onConfirm={refetch}
          confirmButtonLabel={strings('rewards.ondo_campaign_portfolio.retry')}
        />
      </Box>
    );
  }

  if (showSkeleton) {
    return (
      <Box
        twClassName="bg-muted rounded-xl p-4 gap-3"
        testID={ONDO_CAMPAIGN_PORTFOLIO_SNIPPET_TEST_IDS.LOADING}
      >
        <Skeleton style={tw.style('h-6 w-40 rounded-lg')} />
        <Skeleton style={tw.style('h-12 w-full rounded-lg')} />
        <Skeleton style={tw.style('h-12 w-full rounded-lg')} />
      </Box>
    );
  }

  if (hasFetched && !portfolio) {
    return (
      <Box
        twClassName="bg-muted rounded-xl p-4"
        testID={ONDO_CAMPAIGN_PORTFOLIO_SNIPPET_TEST_IDS.EMPTY}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('rewards.ondo_campaign_portfolio.empty')}
        </Text>
      </Box>
    );
  }

  if (!portfolio) {
    return null;
  }

  return (
    <Box
      twClassName="bg-muted rounded-xl p-4 gap-3"
      testID={ONDO_CAMPAIGN_PORTFOLIO_SNIPPET_TEST_IDS.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('rewards.ondo_campaign_portfolio.total_value')}
        </Text>
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Medium}>
          {formatUsd(portfolio.summary.totalCurrentValue)}
        </Text>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('rewards.ondo_campaign_portfolio.portfolio_pnl')}
        </Text>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {formatUsd(portfolio.summary.portfolioPnl)}
        </Text>
      </Box>
      {previewRows.map((row) => (
        <Box
          key={row.tokenAsset}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <TrendingTokenLogo
            assetId={row.tokenAsset}
            symbol={row.tokenSymbol}
            size={36}
          />
          <Box twClassName="flex-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {row.tokenSymbol}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {formatUsd(row.currentValue)}
            </Text>
          </Box>
        </Box>
      ))}
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('rewards.ondo_campaign_portfolio.updated_at', {
          time: formatComputedAt(portfolio.computedAt),
        })}
      </Text>
    </Box>
  );
};

export default OndoCampaignPortfolioSnippet;
