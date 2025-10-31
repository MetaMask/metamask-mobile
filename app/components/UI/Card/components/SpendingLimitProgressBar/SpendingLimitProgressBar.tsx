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
import {
  renderFromTokenMinimalUnit,
  toTokenMinimalUnit,
} from '../../../../../util/number';

interface PriorityToken {
  allowance?: string | null;
  decimals?: number | null;
  symbol?: string | null;
}

interface SpendingLimitSettings {
  limitAmount?: string;
  isFullAccess?: boolean;
}

interface SpendingLimitProgressBarProps {
  priorityToken: PriorityToken;
  spendingLimitSettings: SpendingLimitSettings;
}

const SpendingLimitProgressBar = ({
  priorityToken,
  spendingLimitSettings,
}: SpendingLimitProgressBarProps) => {
  const theme = useTheme();
  const styles = createStyles();

  const calculateRemainingAllowance = (
    limitAmount: string | undefined,
    currentAllowance: string | undefined,
    decimals: number | undefined,
  ): string => {
    const limit = parseFloat(limitAmount || '0');
    const used = parseFloat(currentAllowance || '0');
    const remaining = Math.max(0, limit - used);
    return remaining.toFixed(decimals || 6);
  };

  const remainingAllowanceString = calculateRemainingAllowance(
    spendingLimitSettings.limitAmount,
    priorityToken.allowance || undefined,
    priorityToken.decimals || undefined,
  );

  const remainingAllowance = ethers.BigNumber.from(
    toTokenMinimalUnit(
      remainingAllowanceString,
      priorityToken.decimals || 6,
    ).toString(),
  );

  const totalAllowance = ethers.BigNumber.from(
    toTokenMinimalUnit(
      spendingLimitSettings.limitAmount || '0',
      priorityToken.decimals || 6,
    ).toString(),
  );
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

  const formatDisplayValue = (value: ethers.BigNumber) => {
    const decimalValue = parseFloat(
      renderFromTokenMinimalUnit(value.toString(), priorityToken.decimals || 6),
    );

    const precision = decimalValue < 1 ? 6 : 2;
    const formatted = decimalValue.toFixed(precision);

    return parseFloat(formatted).toString();
  };

  const totalAllowanceDisplay = formatDisplayValue(totalAllowanceOrZero);
  const consumedAmountDisplay = formatDisplayValue(consumedAmount);
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodySMMedium}>Spending Limit</Text>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {consumedAmountDisplay}/{totalAllowanceDisplay} {priorityToken.symbol}
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
