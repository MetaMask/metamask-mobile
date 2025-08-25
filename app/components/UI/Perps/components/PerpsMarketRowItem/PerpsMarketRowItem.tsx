import React from 'react';
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

const PerpsMarketRowItem = ({ market, onPress }: PerpsMarketRowItemProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { assetUrl } = usePerpsAssetMetadata(market.symbol);

  const handlePress = () => {
    onPress?.(market);
  };

  const isPositiveChange = !market.change24h.startsWith('-');

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.leftSection}>
        <View style={styles.perpIcon}>
          {assetUrl ? (
            <RemoteImage source={{ uri: assetUrl }} />
          ) : (
            <Avatar
              variant={AvatarVariant.Network}
              name={market.symbol}
              size={AvatarSize.Lg}
              testID={`perps-market-row-item-${market.symbol}`}
              style={styles.networkAvatar}
            />
          )}
        </View>

        <View style={styles.tokenInfo}>
          <View style={styles.tokenHeader}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {market.symbol}
            </Text>
            <View style={styles.leverageContainer}>
              <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
                {market.maxLeverage}
              </Text>
            </View>
          </View>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.tokenVolume}
          >
            {market.volume}
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
            {market.price}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={isPositiveChange ? TextColor.Success : TextColor.Error}
            style={styles.priceChange}
          >
            {market.change24h} ({market.change24hPercent})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PerpsMarketRowItem;
