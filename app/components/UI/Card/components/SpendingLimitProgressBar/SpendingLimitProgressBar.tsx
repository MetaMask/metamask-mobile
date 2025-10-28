import React, { useMemo } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import createStyles from './SpendingLimitProgressBar.styles';
import { useTheme } from '../../../../../util/theme';
import ProgressBar from 'react-native-progress/Bar';
import { ethers } from 'ethers';

interface SpendingLimitProgressBarProps {
  remainingAllowance?: ethers.BigNumber;
  totalAllowance?: ethers.BigNumber;
  symbol: string;
}

const SpendingLimitProgressBar = ({
  remainingAllowance,
  totalAllowance,
  symbol,
}: SpendingLimitProgressBarProps) => {
  const theme = useTheme();
  const styles = createStyles();

  // Convert serialized BigNumber objects to actual BigNumber instances
  const remainingAllowanceOrZero = remainingAllowance
    ? ethers.BigNumber.from(remainingAllowance)
    : ethers.BigNumber.from(0);
  const totalAllowanceOrZero = totalAllowance
    ? ethers.BigNumber.from(totalAllowance)
    : ethers.BigNumber.from(0);

  const calculateProgress = () => {
    if (totalAllowanceOrZero.isZero()) {
      return 0;
    }

    const consumed = totalAllowanceOrZero.sub(remainingAllowanceOrZero);

    if (consumed.lte(0)) {
      return 0;
    }

    const progressBigNum = consumed.mul(10000).div(totalAllowanceOrZero);
    return progressBigNum.toNumber() / 10000;
  };

  const progress = calculateProgress();

  const progressColor = useMemo(
    () =>
      progress >= 0.8
        ? theme.colors.warning.default
        : theme.colors.info.default,
    [progress, theme],
  );

  const consumedAmount = totalAllowanceOrZero.sub(remainingAllowanceOrZero);

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodySMMedium}>Spending Limit</Text>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {consumedAmount.toString()}/{totalAllowanceOrZero.toString()} {symbol}
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
