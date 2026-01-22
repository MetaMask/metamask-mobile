import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import ButtonBase from '../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
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
    amount: {
      flex: 1,
      backgroundColor: colors.background.muted,
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: 16,
      alignItems: 'center',
      borderRadius: 12,
    },
    amountHighlighted: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.primary.default,
      backgroundColor: colors.primary.muted,
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: 16,
      alignItems: 'center',
      borderRadius: 12,
    },
    amountPrimary: {
      flex: 1,
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: 16,
      alignItems: 'center',
      borderRadius: 12,
    },
    amountDisabled: {
      flex: 1,
      backgroundColor: colors.background.muted,
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: 16,
      alignItems: 'center',
      borderRadius: 12,
      opacity: 0.5,
    },
  });

interface AmountProps {
  amount: QuickAmount;
  disabled?: boolean;
  onPress: (amount: QuickAmount) => void;
  onMaxPress?: () => void;
}

const Amount = ({ amount, onPress, onMaxPress }: AmountProps) => {
  const { value, label, isHighlighted, disabled, isPrimary } = amount;
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

  const getButtonStyle = () => {
    if (disabled) return styles.amountDisabled;
    if (isPrimary) return styles.amountPrimary;
    if (isHighlighted) return styles.amountHighlighted;
    return styles.amount;
  };

  const getLabelColor = () => {
    if (disabled) return TextColor.Muted;
    if (isPrimary) return colors.background.default;
    if (isHighlighted) return TextColor.Primary;
    return TextColor.Default;
  };

  return (
    <>
      <ButtonBase
        onPress={handlePress}
        size={ButtonSize.Md}
        width={ButtonWidthTypes.Full}
        label={label}
        labelColor={getLabelColor()}
        labelTextVariant={TextVariant.BodyMDMedium}
        isDisabled={disabled}
        {...(value === 1 && !isStablecoinLendingEnabled
          ? { startIconName: IconName.Sparkle }
          : {})}
        style={getButtonStyle()}
      />
    </>
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
