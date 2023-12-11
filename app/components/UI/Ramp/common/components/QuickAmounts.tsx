import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../Base/Text';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
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
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

interface AmountProps {
  amount: QuickAmount;
  onPress: (amount: QuickAmount) => any;
  disabled?: boolean;
}

const Amount = ({ amount, onPress, ...props }: AmountProps) => {
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
      <Text grey small centered noMargin>
        {value === 1 && isNative ? (
          <>
            <Icon
              name={IconName.ArrowDoubleRight}
              color={IconColor.Alternative}
              size={IconSize.Xs}
            />{' '}
          </>
        ) : null}
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface Props {
  amounts: QuickAmount[];
  disabled?: boolean;
  onAmountPress: (amount: QuickAmount) => any;
}

const QuickAmounts = ({
  amounts,
  onAmountPress,
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
