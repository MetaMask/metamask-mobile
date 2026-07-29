import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import TraderHeaderIdentity from '../../components/TraderHeaderIdentity';
import PerpBadges from '../../components/PerpBadges';
import { formatPercent } from '../../utils/formatters';
import type { PerpDirection } from '../../utils/perp';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import TraderPositionHeaderTokenLink from './TraderPositionHeaderTokenLink';

export interface TraderPositionCompactTokenStatsProps {
  symbol: string;
  pricePercentChange: number | undefined;
  activeTimePeriodLabel: string;
  traderName: string;
  traderImageUrl?: string;
  traderAddress?: string;
  perpDirection?: PerpDirection | null;
  perpLeverage?: number | null;
  /**
   * Raw perp market symbol used to resolve the tradable market. Provided only
   * for perp positions; when set together with {@link onTokenNavigate} the
   * symbol becomes a tappable link to the Perps market page.
   */
  perpMarketSymbol?: string;
  /** Navigates to the resolved perp market. Perp positions only. */
  onTokenNavigate?: (targetSymbol: string) => void;
  onTraderPress: () => void;
}

const TraderPositionCompactTokenStats: React.FC<
  TraderPositionCompactTokenStatsProps
> = ({
  symbol,
  pricePercentChange,
  activeTimePeriodLabel,
  traderName,
  traderImageUrl,
  traderAddress,
  perpDirection,
  perpLeverage,
  perpMarketSymbol,
  onTokenNavigate,
  onTraderPress,
}) => {
  const hasChange = pricePercentChange != null;
  const isTokenTappable = perpMarketSymbol != null && onTokenNavigate != null;

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      testID={TraderPositionViewSelectorsIDs.COMPACT_TOKEN_STATS}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="max-w-full"
      >
        <Box twClassName="min-w-0 flex-shrink">
          <TraderHeaderIdentity
            traderName={traderName}
            traderImageUrl={traderImageUrl}
            traderAddress={traderAddress}
            variant="breadcrumb"
            onPress={onTraderPress}
            testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TRADER_LINK}
          />
        </Box>
        {perpDirection ? (
          <PerpBadges
            direction={perpDirection}
            leverage={perpLeverage}
            testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_PERP_BADGES}
          />
        ) : null}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="max-w-full px-1"
        testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_CHANGE}
      >
        {isTokenTappable ? (
          <TraderPositionHeaderTokenLink
            symbol={perpMarketSymbol}
            display={symbol}
            onTrade={onTokenNavigate}
            testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL}
            linkTestID={
              TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_LINK
            }
          />
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink"
            testID={TraderPositionViewSelectorsIDs.HEADER_COMPACT_TOKEN_SYMBOL}
          >
            {symbol}
          </Text>
        )}
        {hasChange ? (
          <>
            <Text
              variant={TextVariant.BodySm}
              twClassName={
                pricePercentChange >= 0
                  ? 'text-success-default'
                  : 'text-error-default'
              }
            >
              {formatPercent(pricePercentChange)}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {activeTimePeriodLabel}
            </Text>
          </>
        ) : (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {'\u2014'}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default TraderPositionCompactTokenStats;
