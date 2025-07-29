import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import type { Position, PriceUpdate } from '../../controllers/types';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import RemoteImage from '../../../../Base/RemoteImage';
import { styleSheet } from './PerpsPositionHeader.styles';
import {
  formatPnl,
  formatPercentage,
  formatPrice,
} from '../../utils/formatUtils';
import { PerpsPositionHeaderSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

interface PerpsPositionHeaderProps {
  position: Position;
  onBackPress?: () => void;
  priceData?: PriceUpdate | null;
}

const PerpsPositionHeader: React.FC<PerpsPositionHeaderProps> = ({
  position,
  onBackPress,
  priceData,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { assetUrl } = usePerpsAssetMetadata(position.coin);

  // Calculate 24-hour fiat amount change
  const priceChange24hFiat =
    priceData?.percentChange24h && priceData?.price
      ? (parseFloat(priceData.percentChange24h) / 100) *
        parseFloat(priceData.price) *
        parseFloat(position.size)
      : null;

  const priceChange24h = priceData?.percentChange24h;
  const isPositive24h = priceChange24hFiat ? priceChange24hFiat >= 0 : false;

  return (
    <View style={styles.container}>
      {/* Back Button */}
      {onBackPress && (
        <View style={styles.backButton}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            iconColor={IconColor.Default}
            size={ButtonIconSizes.Md}
            onPress={onBackPress}
            testID={PerpsPositionHeaderSelectorsIDs.BACK_BUTTON}
          />
        </View>
      )}

      {/* Icon Section */}
      <View style={styles.perpIcon}>
        {assetUrl ? (
          <RemoteImage source={{ uri: assetUrl }} style={styles.tokenIcon} />
        ) : (
          <Icon name={IconName.Coin} size={IconSize.Lg} />
        )}
      </View>

      {/* Left Section */}
      <View style={styles.leftSection}>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Default}
          style={styles.assetName}
        >
          {position.coin}-USD
        </Text>
        <View style={styles.positionValueRow}>
          {priceData?.price ? (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Default}
              style={styles.positionValue}
            >
              {formatPrice(parseFloat(priceData.price))}
            </Text>
          ) : (
            <Skeleton height={16} width={80} />
          )}
          {priceChange24hFiat && priceChange24h && (
            <Text
              variant={TextVariant.BodySM}
              color={isPositive24h ? TextColor.Success : TextColor.Error}
              style={styles.priceChange24h}
            >
              {formatPnl(priceChange24hFiat)} (
              {formatPercentage(priceChange24h)})
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default PerpsPositionHeader;
