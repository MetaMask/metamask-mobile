import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import Text from '../../../Base/Text';

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
    },
  });

interface AmountProps {
  label: string;
  value: number;
  onPress: (value: number) => any;
  disabled?: boolean;
}

const Amount: React.FC<AmountProps> = ({
  label,
  value,
  onPress,
  ...props
}: AmountProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const handlePress = useCallback(() => {
    onPress(value);
  }, [onPress, value]);

  return (
    <TouchableOpacity style={styles.amount} onPress={handlePress} {...props}>
      <Text grey small centered noMargin>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface Props {
  amounts: {
    value: number;
    label: string;
  }[];
  disabled?: boolean;
  onAmountPress: (value: number) => any;
}

const QuickAmounts: React.FC<Props> = ({
  amounts,
  onAmountPress,
  disabled,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.content}>
      <ScrollView
        horizontal
        contentContainerStyle={{ paddingLeft: INSET, paddingRight: INSET }}
        showsHorizontalScrollIndicator={false}
      >
        {amounts.map(
          ({ label, value }: Props['amounts'][number], index: number) => (
            <Amount
              label={label}
              value={value}
              onPress={onAmountPress}
              key={index}
              disabled={disabled}
              {...props}
            />
          ),
        )}
      </ScrollView>
    </View>
  );
};

export default QuickAmounts;
