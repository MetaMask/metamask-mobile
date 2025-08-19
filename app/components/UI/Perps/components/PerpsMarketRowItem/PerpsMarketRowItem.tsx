import React, { useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { PerpsMarketRowItemProps } from './PerpsMarketRowItem.types';
import styleSheet from './PerpsMarketRowItem.styles';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import RemoteImage from '../../../../Base/RemoteImage';
import { usePerpsLivePrices } from '../../hooks/stream';
import type { PerpsMarketData } from '../../controllers/types';
import {
  formatPrice,
  formatPercentage,
  formatPnl,
} from '../../utils/formatUtils';

const PerpsMarketRowItem = ({ market, onPress }: PerpsMarketRowItemProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { assetUrl } = usePerpsAssetMetadata(market.symbol);

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

    // Parse and format the price
    const currentPrice = parseFloat(livePrice.price);
    const formattedPrice = formatPrice(currentPrice);

    // Only update if price actually changed
    if (formattedPrice === market.price) {
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
      const priceChange =
        (currentPrice * changePercent) / (100 + changePercent);
      updatedMarket.change24h = formatPnl(priceChange);
    }

    // Update volume if available
    if (livePrice.volume24h) {
      const volume = livePrice.volume24h;
      if (volume >= 1e9) {
        updatedMarket.volume = `$${(volume / 1e9).toFixed(1)}B`;
      } else if (volume >= 1e6) {
        updatedMarket.volume = `$${(volume / 1e6).toFixed(1)}M`;
      } else if (volume >= 1e3) {
        updatedMarket.volume = `$${(volume / 1e3).toFixed(1)}K`;
      } else {
        updatedMarket.volume = `$${volume.toFixed(2)}`;
      }
    }

    return updatedMarket;
  }, [market, livePrices]);

  const handlePress = () => {
    onPress?.(displayMarket);
  };

  const isPositiveChange = !displayMarket.change24h.startsWith('-');

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.leftSection}>
        <View style={styles.perpIcon}>
          {assetUrl ? (
            <RemoteImage source={{ uri: assetUrl }} />
          ) : (
            <Avatar
              variant={AvatarVariant.Network}
              name={displayMarket.symbol}
              size={AvatarSize.Lg}
              testID={`perps-market-row-item-${displayMarket.symbol}`}
              style={styles.networkAvatar}
            />
          )}
        </View>

        <View style={styles.tokenInfo}>
          <View style={styles.tokenHeader}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {displayMarket.symbol}
            </Text>
            <View style={styles.leverageContainer}>
              <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                {displayMarket.maxLeverage}
              </Text>
            </View>
          </View>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
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
            {displayMarket.change24h} ({displayMarket.change24hPercent})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PerpsMarketRowItem;
