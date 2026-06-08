import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Card,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import type { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../../../component-library/hooks';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';
import PerpsTokenLogo from '../PerpsTokenLogo';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  formatPercentage,
  formatPerpsFiat,
  formatPnl,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { getPerpsSuggestedMarketRowSelector } from '../../Perps.testIds';

interface PerpsSuggestedMarketRowProps {
  market: PerpsMarketData;
  /** Called when the row itself is tapped (navigates to market details) */
  onPress?: () => void;
  /** Called when the "+" button is tapped (adds market to watchlist) */
  onAddPress: () => void;
}

const styleSheet = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    addButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background.defaultPressed,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

/**
 * A compact row component for displaying a suggested market in the watchlist
 * empty state. Unlike PerpsMarketRowItem, this component is purpose-built for
 * the suggestion context: it shows volume on the left, live price + 24h change
 * in the middle, and a circular "+" add button as the trailing action.
 */
const PerpsSuggestedMarketRow = ({
  market,
  onPress,
  onAddPress,
}: PerpsSuggestedMarketRowProps) => {
  const { styles } = useStyles(styleSheet, {});

  const livePrices = usePerpsLivePrices({
    symbols: [market.symbol],
    throttleMs: 3000,
  });

  const displayMarket = useMemo(() => {
    const livePrice = livePrices[market.symbol];
    if (!livePrice) return market;

    const currentPrice = parseFloat(livePrice.price);
    const formattedPrice = formatPerpsFiat(currentPrice, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    const comparisonPrice = formatPerpsFiat(currentPrice, {
      minimumDecimals: 2,
      maximumDecimals: 2,
    });

    if (comparisonPrice === market.price) return market;

    const updatedMarket: PerpsMarketData = { ...market, price: formattedPrice };

    if (livePrice.percentChange24h) {
      const changePercent = parseFloat(livePrice.percentChange24h);
      updatedMarket.change24hPercent = formatPercentage(changePercent);
      const divisor = 1 + changePercent / 100;
      const priceChange =
        divisor !== 0 ? currentPrice - currentPrice / divisor : -currentPrice;
      updatedMarket.change24h = formatPnl(priceChange);
    }

    return updatedMarket;
  }, [market, livePrices]);

  const isPositiveChange = !displayMarket.change24h.startsWith('-');

  return (
    <Card
      onPress={onPress}
      testID={getPerpsSuggestedMarketRowSelector.row(market.symbol)}
      touchableOpacityProps={{ activeOpacity: 0.7 }}
      twClassName="flex-row justify-between items-center border-0 rounded-none bg-transparent px-0 py-2"
    >
      {/* Left: icon + symbol + leverage + volume */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1"
      >
        <Box marginRight={4}>
          <PerpsTokenLogo
            symbol={market.symbol}
            size={32}
            recyclingKey={market.symbol}
            testID={getPerpsSuggestedMarketRowSelector.tokenLogo(market.symbol)}
          />
        </Box>

        <Box twClassName="flex-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {getPerpsDisplaySymbol(market.symbol)}
            </Text>
            <PerpsLeverage maxLeverage={market.maxLeverage} />
          </Box>
        </Box>
      </Box>

      {/* Center-right: live price + 24h change */}
      <Box
        alignItems={BoxAlignItems.End}
        justifyContent={BoxJustifyContent.Center}
        gap={1}
        twClassName="mr-3"
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {displayMarket.price}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={
            isPositiveChange ? TextColor.SuccessDefault : TextColor.ErrorDefault
          }
        >
          {displayMarket.change24hPercent}
        </Text>
      </Box>

      {/* Trailing: circular add button */}
      <TouchableOpacity
        onPress={onAddPress}
        testID={getPerpsSuggestedMarketRowSelector.addButton(market.symbol)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <View style={styles.addButton}>
          <Icon
            name={IconName.Add}
            size={IconSize.Md}
            color={IconColor.IconDefault}
          />
        </View>
      </TouchableOpacity>
    </Card>
  );
};

export default React.memo(PerpsSuggestedMarketRow);
