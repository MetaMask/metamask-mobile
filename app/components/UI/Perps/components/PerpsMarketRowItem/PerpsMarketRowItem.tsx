import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { getPerpsMarketRowItemSelector } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import type { PerpsMarketData } from '../../controllers/types';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  formatPercentage,
  formatPerpsFiat,
  formatPnl,
  formatVolume,
  PRICE_RANGES_DETAILED_VIEW,
} from '../../utils/formatUtils';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';
import PerpsTokenLogo from '../PerpsTokenLogo';
import styleSheet from './PerpsMarketRowItem.styles';
import { PerpsMarketRowItemProps } from './PerpsMarketRowItem.types';

const PerpsMarketRowItem = ({ market, onPress }: PerpsMarketRowItemProps) => {
  const { styles } = useStyles(styleSheet, {});

  // Subscribe to live prices for just this symbol
  const livePrices = usePerpsLivePrices({
    symbols: [market.symbol],
    throttleMs: 3000, // 3 seconds for list view
  });

  // Merge live price into market data
  const displayMarket = useMemo(() => {
    const livePrice = livePrices[market.symbol];
    if (!livePrice) {
      return market;
    }

    // Parse and format the price with exactly 2 decimals for consistency
    const currentPrice = parseFloat(livePrice.price);

    const formattedPrice = formatPerpsFiat(currentPrice, {
      ranges: PRICE_RANGES_DETAILED_VIEW,
    });
    const comparisonPrice = formatPerpsFiat(currentPrice, {
      minimumDecimals: 2,
      maximumDecimals: 2,
    });

    // Only update if price actually changed
    if (comparisonPrice === market.price) {
      return market;
    }

    const updatedMarket: PerpsMarketData = {
      ...market,
      price: formattedPrice,
    };

    // Update 24h change if available
    if (livePrice.percentChange24h) {
      const changePercent = parseFloat(livePrice.percentChange24h);
      updatedMarket.change24hPercent = formatPercentage(changePercent);

      // Calculate dollar change
      // If current price is P and change is x%, then:
      // Price 24h ago = P / (1 + x/100)
      // Dollar change = P - (P / (1 + x/100))
      const divisor = 1 + changePercent / 100;
      // Avoid division by zero (would mean -100% change, price went to 0)
      const priceChange =
        divisor !== 0 ? currentPrice - currentPrice / divisor : -currentPrice;
      updatedMarket.change24h = formatPnl(priceChange);
    }

    // Update volume if available
    if (livePrice.volume24h !== undefined) {
      const volume = livePrice.volume24h;

      // Use formatVolume with auto-determined decimals based on magnitude
      if (volume > 0) {
        updatedMarket.volume = formatVolume(volume);
      } else {
        // Only show $0 if volume is truly 0
        updatedMarket.volume = '$0.00';
      }
    } else if (!market.volume || market.volume === '$0') {
      // Fallback: ensure volume field always has a value
      updatedMarket.volume = PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY;
    }

    return updatedMarket;
  }, [market, livePrices]);

  const handlePress = () => {
    onPress?.(displayMarket);
  };

  const isPositiveChange = !displayMarket.change24h.startsWith('-');

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      testID={getPerpsMarketRowItemSelector.rowItem(market.symbol)}
    >
      <View style={styles.leftSection}>
        <View style={styles.perpIcon}>
          <PerpsTokenLogo
            symbol={displayMarket.symbol}
            size={32}
            recyclingKey={displayMarket.symbol}
            testID={getPerpsMarketRowItemSelector.tokenLogo(
              displayMarket.symbol,
            )}
          />
        </View>

        <View style={styles.tokenInfo}>
          <View style={styles.tokenHeader}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {displayMarket.symbol}
            </Text>
            <PerpsLeverage maxLeverage={displayMarket.maxLeverage} />
          </View>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            style={styles.tokenVolume}
          >
            {displayMarket.volume}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.priceInfo}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Default}
            style={styles.price}
          >
            {displayMarket.price}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={isPositiveChange ? TextColor.Success : TextColor.Error}
            style={styles.priceChange}
          >
            {displayMarket.change24hPercent}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PerpsMarketRowItem;
