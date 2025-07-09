import React from 'react';
import { View, Image } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import type { Position } from '../../controllers/types';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import RemoteImage from '../../../../Base/RemoteImage';
import { styleSheet } from './PerpsPositionHeader.styles';

interface PerpsPositionHeaderProps {
  position: Position;
}

const PerpsPositionHeader: React.FC<PerpsPositionHeaderProps> = ({
  position,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { assetUrl } = usePerpsAssetMetadata(position.coin);

  // Format currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  // Format PnL
  const formatPnl = (pnl: string | number) => {
    const num = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(num));
    return num >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  // Calculate PnL percentage
  const pnlNum = parseFloat(position.unrealizedPnl);
  const entryValue =
    parseFloat(position.entryPrice) * Math.abs(parseFloat(position.size));
  const pnlPercentage = entryValue > 0 ? (pnlNum / entryValue) * 100 : 0;

  const isPositivePnl = pnlNum >= 0;

  return (
    <View style={styles.container}>
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
          {position.coin}
        </Text>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Default}
          style={styles.positionValue}
        >
          {formatCurrency(parseFloat(position.positionValue))}
        </Text>
      </View>

      {/* Right Section */}
      <View style={styles.rightSection}>
        <Text
          variant={TextVariant.BodySM}
          color={isPositivePnl ? TextColor.Success : TextColor.Error}
          style={styles.pnlText}
        >
          Unrealized
        </Text>
        <Text
          variant={TextVariant.BodySM}
          color={isPositivePnl ? TextColor.Success : TextColor.Error}
          style={styles.pnlText}
        >
          {formatPnl(position.unrealizedPnl)} ({pnlPercentage.toFixed(2)}%)
        </Text>
      </View>
    </View>
  );
};

export default PerpsPositionHeader;
