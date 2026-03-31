import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import formatFiat from '../../../../../util/formatFiat';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { parseCAIP19AssetId } from '../../../Ramp/Aggregator/utils/parseCaip19AssetId';
import TrendingTokenLogo from '../../../Trending/components/TrendingTokenLogo';
import { getTrendingTokenImageUrl } from '../../../Trending/utils/getTrendingTokenImageUrl';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { useGetOndoPortfolioPosition } from '../../hooks/useGetOndoPortfolioPosition';
import Routes from '../../../../../constants/navigation/Routes';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsInfoBanner from '../RewardsInfoBanner';
import {
  groupPortfolioPositionsByAsset,
  formatPnlPercent,
  isPnlNonNegative,
} from './OndoPortfolio.utils';
import { formatComputedAt } from './OndoLeaderboard.utils';

const getChainHex = (caip19: string): Hex | undefined => {
  const parsed = parseCAIP19AssetId(caip19);
  if (!parsed || parsed.namespace !== 'eip155') return undefined;
  return `0x${parseInt(parsed.chainId, 10).toString(16)}` as Hex;
};

const getAssetNavParams = (
  tokenAsset: string,
  tokenSymbol: string,
  tokenName: string,
) => {
  const parsed = parseCAIP19AssetId(tokenAsset);
  if (!parsed || parsed.namespace !== 'eip155') return null;
  const chainId = `0x${parseInt(parsed.chainId, 10).toString(16)}` as Hex;
  return {
    chainId,
    address: parsed.assetReference,
    symbol: tokenSymbol,
    name: tokenName,
    image: getTrendingTokenImageUrl(tokenAsset),
    isFromTrending: true,
    source: TokenDetailsSource.Trending,
  };
};

export const ONDO_PORTFOLIO_TEST_IDS = {
  CONTAINER: 'ondo-campaign-portfolio-container',
  LOADING: 'ondo-campaign-portfolio-loading',
  ERROR: 'ondo-campaign-portfolio-error',
  EMPTY: 'ondo-campaign-portfolio-empty',
} as const;

const formatUsd = (value: string): string => {
  try {
    return formatFiat(new BigNumber(value), 'USD');
  } catch {
    return value;
  }
};

interface OndoPortfolioProps {
  campaignId: string;
}

const OndoPortfolio: React.FC<OndoPortfolioProps> = ({ campaignId }) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { portfolio, isLoading, hasError, hasFetched, refetch } =
    useGetOndoPortfolioPosition(campaignId);

  const grouped = useMemo(
    () =>
      portfolio ? groupPortfolioPositionsByAsset(portfolio.positions) : [],
    [portfolio],
  );

  const showSkeleton = isLoading && !portfolio;

  if (hasError && !portfolio) {
    return (
      <Box twClassName="gap-3" testID={ONDO_PORTFOLIO_TEST_IDS.ERROR}>
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.ondo_campaign_portfolio.positions_heading')}
        </Text>
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
      <Box twClassName="gap-3" testID={ONDO_PORTFOLIO_TEST_IDS.LOADING}>
        <Skeleton style={tw.style('h-32 rounded-xl')} />
        <Skeleton style={tw.style('h-24 rounded-xl')} />
        <Skeleton style={tw.style('h-24 rounded-xl')} />
      </Box>
    );
  }

  if (hasFetched && !portfolio) {
    return (
      <Box testID={ONDO_PORTFOLIO_TEST_IDS.EMPTY} twClassName="gap-3">
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.ondo_campaign_portfolio.positions_heading')}
        </Text>
        <RewardsInfoBanner
          title={strings('rewards.ondo_campaign_portfolio.empty')}
          description={strings(
            'rewards.ondo_campaign_portfolio.empty_description',
          )}
          onConfirm={() =>
            navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW as never)
          }
          confirmButtonLabel={strings(
            'rewards.ondo_campaign_portfolio.empty_cta',
          )}
        />
      </Box>
    );
  }

  if (!portfolio) {
    return null;
  }

  return (
    <Box twClassName="gap-3" testID={ONDO_PORTFOLIO_TEST_IDS.CONTAINER}>
      {/* Section header */}
      <TouchableOpacity
        onPress={
          grouped.length > 0
            ? () =>
                navigation.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW as never)
            : undefined
        }
        activeOpacity={grouped.length > 0 ? 0.7 : 1}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-4 gap-2"
        >
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.ondo_campaign_portfolio.positions_heading')}
          </Text>
          {grouped.length > 0 && (
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          )}
          <Box twClassName="flex-1" alignItems={BoxAlignItems.End}>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('rewards.ondo_campaign_portfolio.updated_at', {
                time: formatComputedAt(portfolio.computedAt),
              })}
            </Text>
          </Box>
        </Box>
      </TouchableOpacity>

      {/* Positions */}
      <Box twClassName="gap-3">
        {grouped.map((row) => {
          const rowPnlColor = isPnlNonNegative(row.unrealizedPnlPercent)
            ? TextColor.SuccessDefault
            : TextColor.ErrorDefault;
          const rowPnlPercent = formatPnlPercent(row.unrealizedPnlPercent);
          const assetNavParams = getAssetNavParams(
            row.tokenAsset,
            row.tokenSymbol,
            row.tokenName,
          );
          return (
            <TouchableOpacity
              key={row.tokenAsset}
              onPress={() => {
                if (assetNavParams) {
                  navigation.dispatch(
                    StackActions.push('Asset', assetNavParams),
                  );
                }
              }}
              activeOpacity={assetNavParams ? 0.7 : 1}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-3"
              >
                <BadgeWrapper
                  position={BadgeWrapperPosition.BottomRight}
                  badge={
                    getChainHex(row.tokenAsset) ? (
                      <Badge
                        variant={BadgeVariant.Network}
                        size={AvatarSize.Xs}
                        isScaled={false}
                        imageSource={NetworkBadgeSource(
                          getChainHex(row.tokenAsset) as Hex,
                        )}
                      />
                    ) : null
                  }
                >
                  <TrendingTokenLogo
                    assetId={row.tokenAsset}
                    symbol={row.tokenSymbol}
                    size={36}
                  />
                </BadgeWrapper>
                <Box twClassName="flex-1">
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    justifyContent={BoxJustifyContent.Between}
                    alignItems={BoxAlignItems.Center}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {row.tokenName}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {formatUsd(row.currentValue)}
                    </Text>
                  </Box>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    justifyContent={BoxJustifyContent.Between}
                    alignItems={BoxAlignItems.Center}
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings(
                        'rewards.ondo_campaign_portfolio.position_units',
                        {
                          units: row.units,
                        },
                      )}
                    </Text>
                    {rowPnlPercent ? (
                      <Text variant={TextVariant.BodySm} color={rowPnlColor}>
                        {rowPnlPercent}
                      </Text>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            </TouchableOpacity>
          );
        })}
      </Box>
    </Box>
  );
};

export default OndoPortfolio;
