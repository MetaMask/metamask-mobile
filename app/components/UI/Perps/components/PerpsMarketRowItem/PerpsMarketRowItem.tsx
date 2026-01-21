import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { getPerpsMarketRowItemSelector } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import {
  PERPS_CONSTANTS,
  HOME_SCREEN_CONFIG,
} from '../../constants/perpsConfig';
import type { PerpsMarketData } from '../../controllers/types';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  getPerpsDisplaySymbol,
  getMarketBadgeType,
} from '../../utils/marketUtils';
import {
  formatFundingRate,
  formatPercentage,
  formatPerpsFiat,
  formatPnl,
  formatVolume,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import PerpsBadge from '../PerpsBadge';
import PerpsLeverage from '../PerpsLeverage/PerpsLeverage';
import PerpsTokenLogo from '../PerpsTokenLogo';
import styleSheet from './PerpsMarketRowItem.styles';
import { PerpsMarketRowItemProps } from './PerpsMarketRowItem.types';

const PerpsMarketRowItem = ({
  market,
  onPress,
  iconSize = HOME_SCREEN_CONFIG.DEFAULT_ICON_SIZE,
  displayMetric = 'volume',
  showBadge = true,
}: PerpsMarketRowItemProps) => {
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
      // No live price available, use existing formatted price from market data
      return market;
    }

    // Parse and format the price with exactly 2 decimals for consistency
    const currentPrice = parseFloat(livePrice.price);

    const formattedPrice = formatPerpsFiat(currentPrice, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    const comparisonPrice = formatPerpsFiat(currentPrice, {
      minimumDecimals: 2,
      maximumDecimals: 2,
    });

    // Check if funding rate needs updating (even if price hasn't changed)
    const fundingRateChanged =
      livePrice.funding !== undefined &&
      livePrice.funding !== market.fundingRate;

    // Only update if price actually changed or funding rate needs updating
    if (comparisonPrice === market.price && !fundingRateChanged) {
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
        updatedMarket.volume = PERPS_CONSTANTS.ZERO_AMOUNT_DETAILED_DISPLAY;
      }
    } else if (
      !market.volume ||
      market.volume === PERPS_CONSTANTS.ZERO_AMOUNT_DISPLAY
    ) {
      // Fallback: ensure volume field always has a value
      updatedMarket.volume = PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY;
    }

    // Update funding rate from live data if available
    if (livePrice.funding !== undefined) {
      updatedMarket.fundingRate = livePrice.funding;
    }

    return updatedMarket;
  }, [market, livePrices]);

  const handlePress = () => {
    onPress?.(displayMarket);
  };

  // Helper to get display value based on selected metric
  const getDisplayValue = useMemo(() => {
    switch (displayMetric) {
      case 'priceChange':
        return displayMarket.change24hPercent;
      case 'openInterest':
        return (
          displayMarket.openInterest || PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY
        );
      case 'fundingRate':
        // Use formatFundingRate utility for consistent formatting with asset detail screen
        return formatFundingRate(displayMarket.fundingRate);
      case 'volume':
      default:
        return displayMarket.volume;
    }
  }, [displayMetric, displayMarket]);

  // Helper to get shortcut label for the metric indicator
  const getMetricLabel = useMemo(() => {
    switch (displayMetric) {
      case 'priceChange':
        return ''; // Price change doesn't need label (% suffix indicates metric)
      case 'openInterest':
        return strings('perps.sort.open_interest_short');
      case 'fundingRate':
        return strings('perps.sort.funding_rate_short');
      case 'volume':
      default:
        return strings('perps.sort.volume_short');
    }
  }, [displayMetric]);

  // Combine value and label for display (e.g., "$1.2B Vol")
  const displayText = getMetricLabel
    ? `${getDisplayValue} ${getMetricLabel}`
    : getDisplayValue;

  const isPositiveChange = !displayMarket.change24h.startsWith('-');

  const badgeType = getMarketBadgeType(displayMarket);

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
            size={iconSize}
            recyclingKey={displayMarket.symbol}
            testID={getPerpsMarketRowItemSelector.tokenLogo(
              displayMarket.symbol,
            )}
          />
        </View>

        <View style={styles.tokenInfo}>
          <View style={styles.tokenHeader}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {getPerpsDisplaySymbol(displayMarket.symbol)}
            </Text>
            <PerpsLeverage maxLeverage={displayMarket.maxLeverage} />
          </View>
          <View style={styles.secondRow}>
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              numberOfLines={1}
            >
              {displayText}
            </Text>
            {showBadge && badgeType && (
              <PerpsBadge
                type={badgeType}
                testID={getPerpsMarketRowItemSelector.badge(
                  displayMarket.symbol,
                )}
              />
            )}
          </View>
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

export default React.memo(PerpsMarketRowItem);
