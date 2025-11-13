import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './XStockRowItem.styles';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import type { XStockWithData } from '../../../../../components/hooks/useXStocksData';
import {
  getXStockIconUrl,
  SOLANA_MAINNET_CHAIN_ID,
} from '../../../../../constants/xstocks';
import { formatMarketStats } from '../../TrendingTokensSection/TrendingTokensList/TrendingTokenRowItem/utils';
import { getNetworkImageSource } from '../../../../../util/networks';

export interface XStockRowItemProps {
  xstock: XStockWithData;
  onPress: (xstock: XStockWithData) => void;
  iconSize?: number;
}

const XStockRowItem: React.FC<XStockRowItemProps> = ({
  xstock,
  onPress,
  iconSize = 44,
}) => {
  const { styles } = useStyles(styleSheet, {});

  const handlePress = useCallback(() => {
    onPress(xstock);
  }, [onPress, xstock]);

  const networkImageSource = useMemo(
    () => getNetworkImageSource({ chainId: SOLANA_MAINNET_CHAIN_ID }),
    [],
  );

  // Determine the color for percentage change
  const hasPercentageChange =
    xstock.priceChange24h !== undefined && xstock.priceChange24h !== null;
  const isPositiveChange =
    hasPercentageChange && (xstock.priceChange24h as number) > 0;
  const isNeutralChange =
    hasPercentageChange && (xstock.priceChange24h as number) === 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      testID={`xstock-row-item-${xstock.symbol}`}
    >
      <View>
        <BadgeWrapper
          style={styles.badge}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              size={AvatarSize.Xs}
              variant={BadgeVariant.Network}
              imageSource={networkImageSource}
              isScaled={false}
            />
          }
        >
          <Image
            source={{ uri: getXStockIconUrl(xstock) }}
            style={{
              width: iconSize,
              height: iconSize,
              borderRadius: iconSize / 2,
            }}
            resizeMode="contain"
          />
        </BadgeWrapper>
      </View>
      <View style={styles.leftContainer}>
        <View style={styles.tokenHeaderRow}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {xstock.symbol}
          </Text>
        </View>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {xstock.marketCap && xstock.volume24h
            ? formatMarketStats(xstock.marketCap, xstock.volume24h)
            : xstock.name}
        </Text>
      </View>
      <View style={styles.rightContainer}>
        {xstock.price && (
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            ${xstock.price.toFixed(2)}
          </Text>
        )}
        {hasPercentageChange && (
          <Text
            variant={TextVariant.BodySM}
            color={
              isNeutralChange
                ? TextColor.Default
                : isPositiveChange
                  ? TextColor.Success
                  : TextColor.Error
            }
          >
            {isNeutralChange ? '' : isPositiveChange ? '+' : ''}
            {xstock.priceChange24h?.toFixed(2)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default XStockRowItem;
