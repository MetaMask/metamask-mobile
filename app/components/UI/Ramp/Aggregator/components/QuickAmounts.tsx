import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
import { QuickAmount } from '../types';

const INSET = 16;
const createStyles = (colors: Colors) =>
  StyleSheet.create({
    content: {
      backgroundColor: colors.background.section,
      paddingVertical: 12,
    },
    amount: {
      marginRight: 5,
      minWidth: 78,
    },
  });

interface AmountProps {
  amount: QuickAmount;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress: (amount: QuickAmount) => any;
  isBuy: boolean;
  disabled?: boolean;
}

const Amount = ({ amount, onPress, isBuy, disabled }: AmountProps) => {
  const { value, isNative, label } = amount;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const handlePress = useCallback(() => {
    onPress(amount);
  }, [onPress, amount]);

  const showSparkleIcon = !isBuy && value === 1 && isNative;

  return (
    <Button
      variant={ButtonVariants.Secondary}
      size={ButtonSize.Sm}
      label={label}
      onPress={handlePress}
      style={styles.amount}
      startIconName={showSparkleIcon ? IconName.Sparkle : undefined}
      isDisabled={disabled}
    />
  );
};

interface Props {
  amounts: QuickAmount[];
  isBuy: boolean;
  disabled?: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAmountPress: (amount: QuickAmount) => any;
}

const QuickAmounts = ({ amounts, onAmountPress, isBuy, disabled }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.content}>
      <ScrollView
        horizontal
        contentContainerStyle={{ paddingLeft: INSET, paddingRight: INSET }}
        showsHorizontalScrollIndicator={false}
      >
        {amounts.map((amount, index: number) => (
          <Amount
            isBuy={isBuy}
            amount={amount}
            onPress={onAmountPress}
            key={index}
            disabled={disabled}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default QuickAmounts;
