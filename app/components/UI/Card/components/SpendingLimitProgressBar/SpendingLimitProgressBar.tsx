import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  FontWeight,
  Text,
  TextVariant,
  SensitiveText,
  SensitiveTextLength,
} from '@metamask/design-system-react-native';
import createStyles from './SpendingLimitProgressBar.styles';
import { useTheme } from '../../../../../util/theme';
import ProgressBar from 'react-native-progress/Bar';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { CardHomeSelectors } from '../../Views/CardHome/CardHome.testIds';
import { strings } from '../../../../../../locales/i18n';

interface SpendingLimitProgressBarProps {
  decimals: number;
  totalAllowance: string;
  remainingAllowance: string;
  symbol: string;
  isLoading: boolean;
  privacyMode?: boolean;
  hasOriginalAllowance?: boolean;
}

const SpendingLimitProgressBar = ({
  decimals: _decimals,
  totalAllowance,
  remainingAllowance,
  symbol,
  isLoading,
  privacyMode = false,
  hasOriginalAllowance = true,
}: SpendingLimitProgressBarProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const totalAllowanceFloat = parseFloat(totalAllowance) || 0;
  const remainingAllowanceFloat = parseFloat(remainingAllowance) || 0;

  const consumedAmount = totalAllowanceFloat - remainingAllowanceFloat;

  const calculateProgress = () => {
    if (totalAllowanceFloat === 0) {
      return 0;
    }

    if (consumedAmount <= 0) {
      return 0;
    }

    const progress = consumedAmount / totalAllowanceFloat;
    return Math.min(1, Math.max(0, progress));
  };

  const progress = calculateProgress();

  const progressColor = useMemo(
    () =>
      progress >= 0.8
        ? theme.colors.warning.default
        : theme.colors.info.default,
    [progress, theme],
  );

  const formatDisplayValue = (value: number) => {
    const precision = value < 1 ? 6 : 2;
    const formatted = value.toFixed(precision);
    return parseFloat(formatted).toString();
  };

  const totalAllowanceDisplay = formatDisplayValue(totalAllowanceFloat);
  const consumedAmountDisplay = formatDisplayValue(consumedAmount);
  const remainingAllowanceDisplay = formatDisplayValue(remainingAllowanceFloat);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.skeletonContainer]}>
        <Skeleton
          height={20}
          width={'100%'}
          style={styles.skeletonRounded}
          testID={CardHomeSelectors.SPENDING_LIMIT_PROGRESS_BAR_SKELETON}
        />
      </View>
    );
  }

  if (!hasOriginalAllowance) {
    return (
      <View style={styles.container}>
        <View style={styles.divider} />
        <View style={styles.textContainer}>
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            Spending Limit
          </Text>
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Short}
            variant={TextVariant.BodySm}
          >
            {`${remainingAllowanceDisplay} ${symbol} ${strings(
              'card.card_home.spending_limit_available',
            )}`}
          </SensitiveText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
          Spending Limit
        </Text>
        <SensitiveText
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
          variant={TextVariant.BodySm}
        >
          {`${consumedAmountDisplay}/${totalAllowanceDisplay} ${symbol}`}
        </SensitiveText>
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
