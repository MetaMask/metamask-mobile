import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { getPerpsMarketRowItemSelector } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
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
} from '@metamask/design-system-react-native';
import {
  PERPS_CONSTANTS,
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import { usePerpsLivePrices } from '../../hooks/stream';
import { getMarketBadgeType } from '../../utils/marketUtils';
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
import { PerpsMarketRowItemProps } from './PerpsMarketRowItem.types';
import { useStyles } from '../../../../../component-library/hooks';
import type { Theme } from '@metamask/design-tokens';
import { selectPerpsShowFullAssetNamesFlag } from '../../selectors/featureFlags';

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
    name: {
      flexShrink: 1,
    },
  });

const PerpsMarketRowItem = ({
  market,
  onPress,
  iconSize = HOME_SCREEN_CONFIG.DefaultIconSize,
  displayMetric = 'volume',
  showBadge = false,
  compact = false,
  onAddPress,
}: PerpsMarketRowItemProps) => {
  // Subscribe to live prices for just this symbol
  const livePrices = usePerpsLivePrices({
    symbols: [market.symbol],
    throttleMs: 3000, // 3 seconds for list view
  });

  const { styles } = useStyles(styleSheet, {});

  const showFullAssetNames = useSelector(selectPerpsShowFullAssetNamesFlag);

  // Merge live price into market data
  const displayMarket = useMemo(() => {
    const livePrice = livePrices[market.symbol];
    if (!livePrice) {
      return market;
    }

    const currentPrice = parseFloat(livePrice.price);

    const formattedPrice = formatPerpsFiat(currentPrice, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    const comparisonPrice = formatPerpsFiat(currentPrice, {
      minimumDecimals: 2,
      maximumDecimals: 2,
    });

    const fundingRateChanged =
      livePrice.funding !== undefined &&
      livePrice.funding !== market.fundingRate;

    if (comparisonPrice === market.price && !fundingRateChanged) {
      return market;
    }

    const updatedMarket: PerpsMarketData = {
      ...market,
      price: formattedPrice,
    };

    if (livePrice.percentChange24h) {
      const changePercent = parseFloat(livePrice.percentChange24h);
      updatedMarket.change24hPercent = formatPercentage(changePercent);

      // If current price is P and change is x%, price 24h ago = P / (1 + x/100)
      const divisor = 1 + changePercent / 100;
      const priceChange =
        divisor !== 0 ? currentPrice - currentPrice / divisor : -currentPrice;
      updatedMarket.change24h = formatPnl(priceChange);
    }

    if (livePrice.volume24h !== undefined) {
      const volume = livePrice.volume24h;
      if (volume > 0) {
        updatedMarket.volume = formatVolume(volume);
      } else {
        updatedMarket.volume = PERPS_CONSTANTS.ZeroAmountDetailedDisplay;
      }
    } else if (
      !market.volume ||
      market.volume === PERPS_CONSTANTS.ZeroAmountDisplay
    ) {
      updatedMarket.volume = PERPS_CONSTANTS.FallbackPriceDisplay;
    }

    if (livePrice.funding !== undefined) {
      updatedMarket.fundingRate = livePrice.funding;
    }

    return updatedMarket;
  }, [market, livePrices]);

  const handlePress = () => {
    onPress?.(displayMarket);
  };

  const getDisplayValue = useMemo(() => {
    switch (displayMetric) {
      case 'priceChange':
        return displayMarket.change24hPercent;
      case 'openInterest':
        return (
          displayMarket.openInterest || PERPS_CONSTANTS.FallbackPriceDisplay
        );
      case 'fundingRate':
        return formatFundingRate(displayMarket.fundingRate);
      case 'volume':
      default:
        return displayMarket.volume;
    }
  }, [displayMetric, displayMarket]);

  const getMetricLabel = useMemo(() => {
    switch (displayMetric) {
      case 'priceChange':
        return '';
      case 'openInterest':
        return strings('perps.sort.open_interest_short');
      case 'fundingRate':
        return strings('perps.sort.funding_rate_short');
      case 'volume':
      default:
        return strings('perps.sort.volume_short');
    }
  }, [displayMetric]);

  const displayText = getMetricLabel
    ? `${getDisplayValue} ${getMetricLabel}`
    : getDisplayValue;

  const isPositiveChange = !displayMarket.change24h.startsWith('-');

  const badgeType = getMarketBadgeType(displayMarket);

  return (
    <Card
      onPress={handlePress}
      testID={getPerpsMarketRowItemSelector.rowItem(market.symbol)}
      touchableOpacityProps={{ activeOpacity: 0.7 }}
      twClassName={`flex-row justify-between items-center border-0 rounded-none bg-transparent px-0 ${compact ? 'py-2' : 'py-3'}`}
    >
      {/* Left section: Icon + token info */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1"
      >
        <Box marginRight={4}>
          <PerpsTokenLogo
            symbol={displayMarket.symbol}
            size={iconSize}
            recyclingKey={displayMarket.symbol}
            testID={getPerpsMarketRowItemSelector.tokenLogo(
              displayMarket.symbol,
            )}
          />
        </Box>

        <Box twClassName="flex-1">
          {/* Asset label + leverage */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Default}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.name}
              testID={getPerpsMarketRowItemSelector.assetLabel(
                displayMarket.symbol,
              )}
            >
              {showFullAssetNames && displayMarket.name
                ? displayMarket.name
                : getPerpsDisplaySymbol(displayMarket.symbol)}
            </Text>
            <PerpsLeverage maxLeverage={displayMarket.maxLeverage} />
          </Box>

          {/* Metric row */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="mt-0.5"
          >
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
          </Box>
        </Box>
      </Box>

      {/* Right section: Price + 24h change + optional add button */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.End}
        gap={2}
      >
        <Box alignItems={BoxAlignItems.End} gap={1}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {displayMarket.price}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={isPositiveChange ? TextColor.Success : TextColor.Error}
          >
            {displayMarket.change24hPercent}
          </Text>
        </Box>

        {onAddPress && (
          <TouchableOpacity
            onPress={() => onAddPress(displayMarket)}
            testID={getPerpsMarketRowItemSelector.addButton(
              displayMarket.symbol,
            )}
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
        )}
      </Box>
    </Card>
  );
};

export default React.memo(PerpsMarketRowItem);
