import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { Theme } from '../../../util/theme/models';

interface PerpsPositionsHeaderProps {
  totalPortfolioValue: number;
  total24hChange: number;
  total24hChangePercent: number;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 32,
      paddingHorizontal: 4,
    },
    balanceSection: {
      flex: 1,
    },
    balanceAmount: {
      marginBottom: 8,
      fontSize: 32,
      fontWeight: '700' as const,
    },
    priceChangeContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    priceChangeText: {
      marginRight: 8,
    },
    todayLabel: {
      marginLeft: 4,
    },

    chartSection: {
      marginLeft: 16,
    },
    chartPlaceholder: {
      width: 80,
      height: 50,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
  };
};

const PerpsPositionsHeader: React.FC<PerpsPositionsHeaderProps> = ({
  totalPortfolioValue,
  total24hChange,
  total24hChangePercent,
}) => {
  const { styles } = useStyles(styleSheet, {});

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  const isPositiveChange = total24hChangePercent >= 0;

  return (
    <View style={styles.container}>
      {/* Balance Section */}
      <View style={styles.balanceSection}>
        <Text
          variant={TextVariant.HeadingLG}
          color={TextColor.Default}
          style={styles.balanceAmount}
        >
          {formatCurrency(totalPortfolioValue)}
        </Text>
        <View style={styles.priceChangeContainer}>
          <Text
            variant={TextVariant.BodySM}
            color={isPositiveChange ? TextColor.Success : TextColor.Error}
            style={styles.priceChangeText}
          >
            {isPositiveChange ? '+' : ''}
            {formatCurrency(total24hChange)} ({total24hChangePercent.toFixed(2)}
            %)
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.todayLabel}
          >
            Today
          </Text>
        </View>
      </View>

      {/* Chart Section */}
      <View style={styles.chartSection}>
        <View style={styles.chartPlaceholder}>
          <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
            Chart
          </Text>
        </View>
      </View>
    </View>
  );
};

export default PerpsPositionsHeader;
