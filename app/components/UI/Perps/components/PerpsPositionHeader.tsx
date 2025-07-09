import React from 'react';
import { View, Image } from 'react-native';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../util/theme/models';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import type { Position } from '../controllers/types';
import { usePerpsAssetMetadata } from '../hooks/usePerpsAssetMetadata';
import RemoteImage from '../../../Base/RemoteImage';

interface PerpsPositionHeaderProps {
  position: Position;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      margin: 16,
      backgroundColor: colors.background.default,
      padding: 16,
    },
    leftSection: {
      alignItems: 'flex-start' as const,
      flex: 1,
    },
    rightSection: {
      alignItems: 'flex-end' as const,
      flex: 1,
    },
    perpIcon: {
      marginRight: 16,
      width: 32,
      height: 32,
    },
    tokenIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    positionInfo: {
      flex: 1,
    },
    assetInfo: {
      flexDirection: 'column' as const,
      alignItems: 'flex-start' as const,
      marginBottom: 8,
    },
    assetName: {
      marginRight: 12,
    },

    positionValue: {
      marginBottom: 8,
    },
    pnlContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    pnlText: {
      marginRight: 8,
    },
    unrealizedLabel: {
      marginLeft: 4,
    },
    chartSection: {
      marginLeft: 16,
      alignItems: 'flex-end' as const,
    },
    chartPlaceholder: {
      width: 80,
      height: 50,
      backgroundColor: colors.background.default,
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
  };
};

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
