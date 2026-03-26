import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { strings } from '../../../../../locales/i18n';
import formatFiat from '../../../../util/formatFiat';
import Routes from '../../../../constants/navigation/Routes';
import TrendingTokenLogo from '../../Trending/components/TrendingTokenLogo';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { useGetOndoCampaignPortfolioPosition } from '../hooks/useGetOndoCampaignPortfolioPosition';
import { groupPortfolioPositionsByAsset } from '../components/Campaigns/OndoCampaignPortfolio.utils';
import { formatComputedAt } from '../components/Campaigns/OndoLeaderboard.utils';

type OndoCampaignPortfolioRouteParams = Record<
  typeof Routes.REWARDS_ONDO_CAMPAIGN_PORTFOLIO,
  { campaignId: string }
>;

export const ONDO_CAMPAIGN_PORTFOLIO_VIEW_TEST_IDS = {
  CONTAINER: 'ondo-campaign-portfolio-view-container',
} as const;

const formatUsd = (value: string): string => {
  try {
    return formatFiat(new BigNumber(value), 'USD');
  } catch {
    return value;
  }
};

const OndoCampaignPortfolioView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<
        OndoCampaignPortfolioRouteParams,
        typeof Routes.REWARDS_ONDO_CAMPAIGN_PORTFOLIO
      >
    >();
  const { campaignId } = route.params;

  const { portfolio, isLoading, hasError, hasFetched, refetch } =
    useGetOndoCampaignPortfolioPosition(campaignId);

  const grouped = useMemo(
    () =>
      portfolio ? groupPortfolioPositionsByAsset(portfolio.positions) : [],
    [portfolio],
  );

  const showSkeleton = isLoading && !hasFetched;
  const showEmpty = hasFetched && !hasError && !portfolio;

  return (
    <ErrorBoundary navigation={navigation} view="OndoCampaignPortfolioView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={ONDO_CAMPAIGN_PORTFOLIO_VIEW_TEST_IDS.CONTAINER}
      >
        <HeaderCompactStandard
          title={strings('rewards.ondo_campaign_portfolio.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'ondo-campaign-portfolio-back-button' }}
          includesTopInset
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {hasError && (
            <Box twClassName="px-4 pt-4">
              <RewardsErrorBanner
                title={strings('rewards.ondo_campaign_portfolio.error_loading')}
                description={strings(
                  'rewards.ondo_campaign_portfolio.error_loading_description',
                )}
                onConfirm={refetch}
                confirmButtonLabel={strings(
                  'rewards.ondo_campaign_portfolio.retry',
                )}
              />
            </Box>
          )}

          {showSkeleton && (
            <Box twClassName="px-4 pt-4 gap-3">
              <Skeleton style={tw.style('h-32 rounded-xl')} />
              <Skeleton style={tw.style('h-24 rounded-xl')} />
              <Skeleton style={tw.style('h-24 rounded-xl')} />
            </Box>
          )}

          {showEmpty && (
            <Box twClassName="px-4 pt-4">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('rewards.ondo_campaign_portfolio.empty')}
              </Text>
            </Box>
          )}

          {!showSkeleton && !hasError && portfolio && (
            <>
              <Box twClassName="px-4 pt-4 gap-3">
                <Box
                  twClassName="bg-muted rounded-xl p-4 gap-2"
                  flexDirection={BoxFlexDirection.Column}
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    justifyContent={BoxJustifyContent.Between}
                    alignItems={BoxAlignItems.Center}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings('rewards.ondo_campaign_portfolio.total_value')}
                    </Text>
                    <Text
                      variant={TextVariant.HeadingMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {formatUsd(portfolio.summary.totalCurrentValue)}
                    </Text>
                  </Box>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    justifyContent={BoxJustifyContent.Between}
                    alignItems={BoxAlignItems.Center}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings(
                        'rewards.ondo_campaign_portfolio.summary_cost_basis',
                      )}
                    </Text>
                    <Text variant={TextVariant.BodyMd}>
                      {formatUsd(portfolio.summary.totalCostBasis)}
                    </Text>
                  </Box>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    justifyContent={BoxJustifyContent.Between}
                    alignItems={BoxAlignItems.Center}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings('rewards.ondo_campaign_portfolio.portfolio_pnl')}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {formatUsd(portfolio.summary.portfolioPnl)}
                    </Text>
                  </Box>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {strings('rewards.ondo_campaign_portfolio.updated_at', {
                      time: formatComputedAt(portfolio.computedAt),
                    })}
                  </Text>
                </Box>
              </Box>

              <Box twClassName="border-b border-border-muted mt-4" />
              <Box twClassName="px-4 py-4 gap-3">
                <Text
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('rewards.ondo_campaign_portfolio.positions_heading')}
                </Text>
                {grouped.map((row) => (
                  <Box
                    key={row.tokenAsset}
                    twClassName="bg-muted rounded-xl p-4"
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                  >
                    <TrendingTokenLogo
                      assetId={row.tokenAsset}
                      symbol={row.tokenSymbol}
                      size={44}
                    />
                    <Box twClassName="flex-1 ml-3">
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                      >
                        {row.tokenName}
                      </Text>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {row.tokenSymbol} ·{' '}
                        {strings(
                          'rewards.ondo_campaign_portfolio.position_current_value',
                        )}{' '}
                        {formatUsd(row.currentValue)}
                      </Text>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {strings(
                          'rewards.ondo_campaign_portfolio.position_unrealized_pnl',
                        )}{' '}
                        {formatUsd(row.unrealizedPnl)}
                      </Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default OndoCampaignPortfolioView;
