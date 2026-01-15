import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import createStyles from './SpendingLimitProgressBar.styles';
import { useTheme } from '../../../../../util/theme';
import ProgressBar from 'react-native-progress/Bar';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { CardHomeSelectors } from '../../Views/CardHome/CardHome.testIds';

interface SpendingLimitProgressBarProps {
  decimals: number;
  totalAllowance: string;
  remainingAllowance: string;
  symbol: string;
  isLoading: boolean;
}

const SpendingLimitProgressBar = ({
  decimals: _decimals,
  totalAllowance,
  remainingAllowance,
  symbol,
  isLoading,
}: SpendingLimitProgressBarProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  // Parse values as floats
  const totalAllowanceFloat = parseFloat(totalAllowance) || 0;
  const remainingAllowanceFloat = parseFloat(remainingAllowance) || 0;

  // Calculate consumed amount
  const consumedAmount = totalAllowanceFloat - remainingAllowanceFloat;

  // Calculate progress (0 to 1)
  const calculateProgress = () => {
    if (totalAllowanceFloat === 0) {
      return 0;
    }

    if (consumedAmount <= 0) {
      return 0;
    }

    const progress = consumedAmount / totalAllowanceFloat;
    return Math.min(1, Math.max(0, progress)); // Clamp between 0 and 1
  };

  const progress = calculateProgress();

  const progressColor = useMemo(
    () =>
      progress >= 0.8
        ? theme.colors.warning.default
        : theme.colors.info.default,
    [progress, theme],
  );

  // Format display values with appropriate precision
  const formatDisplayValue = (value: number) => {
    const precision = value < 1 ? 6 : 2;
    const formatted = value.toFixed(precision);
    return parseFloat(formatted).toString();
  };

  const totalAllowanceDisplay = formatDisplayValue(totalAllowanceFloat);
  const consumedAmountDisplay = formatDisplayValue(consumedAmount);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton
          height={20}
          width={'100%'}
          style={styles.skeletonRounded}
          testID={CardHomeSelectors.SPENDING_LIMIT_PROGRESS_BAR_SKELETON}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodySMMedium}>Spending Limit</Text>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {consumedAmountDisplay}/{totalAllowanceDisplay} {symbol}
        </Text>
      </View>
      <ProgressBar
        progress={progress}
        width={null as unknown as number}
        color={progressColor}
        height={8}
        borderRadius={4}
        borderWidth={0}
        unfilledColor={theme.colors.border.muted}
      />
    </View>
  );
};

export default SpendingLimitProgressBar;
