import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';
import Text from '../../../Base/Text';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import { QuickAmount } from '../types';

const INSET = 25;
const createStyles = (colors: Colors) =>
  StyleSheet.create({
    content: {
      backgroundColor: colors.background.alternative,
      paddingVertical: 12,
    },
    amount: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border.default,
      marginRight: 5,
      minWidth: 78,
      padding: 7,
      flexDirection: 'row',
      justifyContent: 'center',
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

const Amount = ({ amount, onPress, isBuy, ...props }: AmountProps) => {
  const { value, isNative, label } = amount;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const handlePress = useCallback(() => {
    onPress(amount);
  }, [onPress, amount]);

  return (
    <TouchableOpacity
      style={styles.amount}
      onPress={handlePress}
      accessibilityRole="button"
      accessible
      {...props}
    >
      {/*
        We need to show the sparkle icon only when the value is 1 (100%) and is native token
        to account for the gas estimation
      */}
      {!isBuy && value === 1 && isNative ? (
        <Icon
          name={IconName.Sparkle}
          color={IconColor.Alternative}
          size={IconSize.Sm}
        />
      ) : null}
      <Text grey small centered noMargin>
        {label}
      </Text>
    </TouchableOpacity>
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

const QuickAmounts = ({
  amounts,
  onAmountPress,
  isBuy,
  disabled,
  ...props
}: Props) => {
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
            {...props}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default QuickAmounts;
