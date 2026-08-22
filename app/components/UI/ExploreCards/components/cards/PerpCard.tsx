import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  getPerpsDisplaySymbol,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import PerpsTokenLogo from '../../../Perps/components/PerpsTokenLogo';
import PerpsLeverage from '../../../Perps/components/PerpsLeverage/PerpsLeverage';
import { formatPerpsPrice } from '../../../Perps/utils/formatUtils';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import CardFrame from '../CardFrame';
import { trackExploreCardsCta } from '../../utils/exploreCardsAnalytics';

export interface PerpCardProps {
  market: PerpsMarketData;
  rank: number;
}

/**
 * Perp market card: 24h change hero stat + dual Long / Short CTAs.
 *
 * This screen lives OUTSIDE the Perps stack, so both actions must navigate
 * into `Routes.PERPS.ROOT` with a nested screen (same pattern as the Explore
 * feed rows and TokenDetails' `usePerpsActions`). `usePerpsNavigation`'s
 * direct `navigate(Routes.PERPS.MARKET_DETAILS)` etc. only resolve from
 * within the Perps stack and are silently dropped elsewhere. Orders go via
 * `PERPS.ORDER_REDIRECT`, which waits for the perps WebSocket connection
 * before creating the trade.
 */
const PerpCard: React.FC<PerpCardProps> = ({ market, rank }) => {
  const navigation = useNavigation<AppNavigationProp>();

  const isPositive = !market.change24hPercent.startsWith('-');

  const handleBodyPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market,
        source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
        source_section: 'explore_cards',
      },
    });
  }, [navigation, market]);

  const handleOrder = useCallback(
    (direction: 'long' | 'short') => {
      trackExploreCardsCta('perp', direction, market.symbol);
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.ORDER_REDIRECT,
        params: {
          direction,
          asset: market.symbol,
        },
      });
    },
    [navigation, market.symbol],
  );

  return (
    <CardFrame
      type="perp"
      rank={rank}
      onBodyPress={handleBodyPress}
      testID={`explore-card-perp-${market.symbol}`}
      cta={
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          <Box twClassName="flex-1">
            <Button
              size={ButtonBaseSize.Lg}
              isFullWidth
              twClassName="bg-success-muted"
              onPress={() => handleOrder('long')}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {strings('explore_cards.cta_long')}
              </Text>
            </Button>
          </Box>
          <Box twClassName="flex-1">
            <Button
              size={ButtonBaseSize.Lg}
              isFullWidth
              twClassName="bg-error-muted"
              onPress={() => handleOrder('short')}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.ErrorDefault}
              >
                {strings('explore_cards.cta_short')}
              </Text>
            </Button>
          </Box>
        </Box>
      }
    >
      <Box twClassName="flex-1 items-center justify-center gap-1">
        <PerpsTokenLogo
          symbol={market.symbol}
          size={72}
          recyclingKey={market.symbol}
        />
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2 mt-3"
        >
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            numberOfLines={1}
          >
            {getPerpsDisplaySymbol(market.symbol)}
          </Text>
          <PerpsLeverage maxLeverage={market.maxLeverage} />
        </Box>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {market.name}
        </Text>
        <Text
          variant={TextVariant.BodyLg}
          fontWeight={FontWeight.Medium}
          twClassName="mt-1"
        >
          {formatPerpsPrice(market.price)}
        </Text>
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={isPositive ? TextColor.SuccessDefault : TextColor.ErrorDefault}
        >
          {market.change24hPercent}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {strings('explore_cards.stat_24h')}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-4 mt-3"
        >
          <Box twClassName="items-center">
            <Text variant={TextVariant.BodySm}>{market.volume}</Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('explore_cards.stat_volume')}
            </Text>
          </Box>
          {market.fundingRate !== undefined && (
            <Box twClassName="items-center">
              <Text variant={TextVariant.BodySm}>
                {`${(market.fundingRate * 100).toFixed(4)}%`}
              </Text>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {strings('explore_cards.stat_funding')}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </CardFrame>
  );
};

export default PerpCard;
