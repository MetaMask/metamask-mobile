import React, { useState } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { Theme } from '../../../util/theme/models';

interface PositionData {
  id: string;
  assetSymbol: string;
  tokenPair: string;
  leverage: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  positionSize: number;
  entryPrice: number;
  liquidationPrice: number;
  funding: number;
  margin: number;
  takeProfitStopLoss: number;
}

interface PerpsPositionListItemProps {
  position: PositionData;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      marginBottom: 12,
      backgroundColor: colors.background.default,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.muted,
      overflow: 'hidden' as const,
    },
    collapsedContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: 16,
    },
    assetIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background.alternative,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: 12,
    },
    assetText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.text.default,
    },
    middleSection: {
      flex: 1,
      marginRight: 12,
    },
    tokenPair: {
      marginBottom: 4,
    },
    leverage: {
      marginTop: 2,
    },
    rightSection: {
      alignItems: 'flex-end' as const,
      minWidth: 80,
    },
    currentPrice: {
      marginBottom: 4,
    },
    priceChange: {
      marginBottom: 0,
    },
    priceChangePositive: {
      color: colors.success.default,
    },
    priceChangeNegative: {
      color: colors.error.default,
    },
    expandIcon: {
      marginLeft: 8,
      fontSize: 16,
      color: colors.icon.muted,
    },
    expandedContent: {
      borderTopColor: colors.border.muted,
    },
    expandedGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
      padding: 16,
    },
    expandedItem: {
      width: '48%' as const,
    },
    expandedLabel: {
      marginBottom: 4,
    },
    expandedValue: {
      fontWeight: '600' as const,
    },
  };
};

const PerpsPositionListItem: React.FC<PerpsPositionListItemProps> = ({
  position,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandAnimation] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.timing(expandAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setIsExpanded(!isExpanded);
  };

  const expandedHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200], // Adjust this based on content height
  });

  const rotateArrow = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  const expandedData = [
    { label: 'Position Size', value: formatCurrency(position.positionSize) },
    { label: 'Entry Price', value: formatCurrency(position.entryPrice) },
    {
      label: 'Liquidation Price',
      value: formatCurrency(position.liquidationPrice),
    },
    { label: 'Funding', value: formatCurrency(position.funding) },
    { label: 'Margin', value: formatCurrency(position.margin) },
    { label: 'TP/SL', value: formatCurrency(position.takeProfitStopLoss) },
  ];

  const expandedContentStyle = {
    height: expandedHeight,
    opacity: expandAnimation,
    paddingLeft: isExpanded ? 16 : 0,
    borderTopWidth: isExpanded ? 1 : 0,
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
        <View style={styles.collapsedContent}>
          {/* Asset Icon */}
          <View style={styles.assetIcon}>
            <Text style={styles.assetText}>{position.assetSymbol}</Text>
          </View>

          {/* Middle Section */}
          <View style={styles.middleSection}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Default}
              style={styles.tokenPair}
            >
              {position.tokenPair}
            </Text>
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              style={styles.leverage}
            >
              {position.leverage} leverage
            </Text>
          </View>

          {/* Right Section */}
          <View style={styles.rightSection}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Default}
              style={styles.currentPrice}
            >
              {formatCurrency(position.currentPrice)}
            </Text>
            <Text
              variant={TextVariant.BodySM}
              style={[
                styles.priceChange,
                position.priceChangePercent24h >= 0
                  ? styles.priceChangePositive
                  : styles.priceChangeNegative,
              ]}
            >
              {position.priceChangePercent24h >= 0 ? '+' : ''}
              {position.priceChangePercent24h.toFixed(2)}%
            </Text>
          </View>

          {/* Expand Icon */}
          <Animated.Text
            style={[
              styles.expandIcon,
              { transform: [{ rotate: rotateArrow }] },
            ]}
          >
            ›
          </Animated.Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      <Animated.View style={[styles.expandedContent, expandedContentStyle]}>
        {isExpanded && (
          <View style={styles.expandedGrid}>
            {expandedData.map((item, index) => (
              <View key={index} style={styles.expandedItem}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Muted}
                  style={styles.expandedLabel}
                >
                  {item.label}
                </Text>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                  style={styles.expandedValue}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default PerpsPositionListItem;
