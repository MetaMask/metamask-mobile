import React from 'react';
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
  spendingLimit?: ethers.BigNumber;
  availableBalance?: ethers.BigNumber;
  symbol: string;
}

const SpendingLimitProgressBar = ({
  spendingLimit,
  availableBalance,
  symbol,
}: SpendingLimitProgressBarProps) => {
  const theme = useTheme();
  const styles = createStyles();

  const availableBalanceOrZero = availableBalance ?? ethers.BigNumber.from(0);
  const spendingLimitOrZero = spendingLimit ?? ethers.BigNumber.from(0);

  if (
    availableBalanceOrZero === undefined ||
    spendingLimitOrZero === undefined
  ) {
    return null;
  }

  const progress = availableBalanceOrZero.gt(spendingLimitOrZero)
    ? 1
    : availableBalanceOrZero?.div(spendingLimitOrZero).toNumber();

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodySMMedium}>Spending Limit</Text>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {availableBalanceOrZero.toString()}/{spendingLimitOrZero.toString()}{' '}
          {symbol}
        </Text>
      </View>
      <ProgressBar
        progress={progress}
        width={null as unknown as number}
        color={theme.colors.info.default}
        height={8}
        borderRadius={4}
        borderWidth={0}
        unfilledColor={theme.colors.border.muted}
      />
    </View>
  );
};

export default SpendingLimitProgressBar;
