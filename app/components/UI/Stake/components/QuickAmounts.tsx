import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import { colors as staticColors } from '../../../../styles/common';
import type { QuickAmount } from '../../Earn/types/lending.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useSelector } from 'react-redux';
import { selectStablecoinLendingEnabledFlag } from '../../Earn/selectors/featureFlags';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    content: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      padding: 16,
    },
    // Transparent border prevents layout shift when switching between ButtonVariants.Secondary
    // (which has borderWidth: 1) and ButtonVariants.Primary (which has no border)
    button: {
      flex: 1,
      borderWidth: 1,
      borderColor: staticColors.transparent,
    },
  });

interface AmountProps {
  amount: QuickAmount;
  onPress: (amount: QuickAmount) => void;
  onMaxPress?: () => void;
}

const Amount = ({ amount, onPress, onMaxPress }: AmountProps) => {
  const { value, label, isHighlighted, disabled } = amount;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const handlePress = useCallback(() => {
    if (value === 1 && onMaxPress) {
      onMaxPress();
      return;
    }
    onPress(amount);
  }, [value, onMaxPress, amount, onPress]);

  const showSparkleIcon = value === 1 && !isStablecoinLendingEnabled;

  return (
    <Button
      variant={
        isHighlighted ? ButtonVariants.Primary : ButtonVariants.Secondary
      }
      size={ButtonSize.Md}
      width={ButtonWidthTypes.Full}
      label={label}
      onPress={handlePress}
      isDisabled={disabled}
      startIconName={showSparkleIcon ? IconName.Sparkle : undefined}
      style={styles.button}
    />
  );
};

interface QuickAmountsProps {
  amounts: QuickAmount[];
  onAmountPress: (amount: QuickAmount) => void;
  onMaxPress?: () => void;
}

const QuickAmounts = ({
  amounts,
  onAmountPress,
  onMaxPress,
}: QuickAmountsProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.content}>
      {amounts.map((amount, index: number) => (
        <Amount
          amount={amount}
          onPress={onAmountPress}
          onMaxPress={onMaxPress}
          key={index}
        />
      ))}
    </View>
  );
};

export default QuickAmounts;
