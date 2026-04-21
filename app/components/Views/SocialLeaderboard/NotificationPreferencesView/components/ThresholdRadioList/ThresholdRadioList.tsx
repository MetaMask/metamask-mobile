import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../../util/theme';
import { TX_AMOUNT_THRESHOLDS, type TxAmountThreshold } from '../../hooks';

const radioStyles = StyleSheet.create({
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export const formatThreshold = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount}`;
  }
};

interface ThresholdRowProps {
  label: string;
  isChecked: boolean;
  isDisabled: boolean;
  onPress: () => void;
  testID?: string;
}

const ThresholdRow: React.FC<ThresholdRowProps> = ({
  label,
  isChecked,
  isDisabled,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const borderColor = isChecked
    ? colors.primary.default
    : colors.border.default;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={tw.style(
        'flex-row items-center justify-between px-4 py-4',
        isDisabled && 'opacity-50',
      )}
      accessibilityRole="radio"
      accessibilityState={{ checked: isChecked, disabled: isDisabled }}
    >
      <Text
        variant={TextVariant.BodyMd}
        color={isDisabled ? TextColor.TextMuted : TextColor.TextDefault}
      >
        {label}
      </Text>
      <View
        style={[
          radioStyles.circle,
          { borderColor, backgroundColor: colors.background.default },
        ]}
        accessibilityElementsHidden
      >
        {isChecked && (
          <View
            style={[
              radioStyles.dot,
              { backgroundColor: colors.primary.default },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export interface ThresholdRadioListProps {
  selected: TxAmountThreshold;
  onChange: (value: TxAmountThreshold) => void;
  isDisabled: boolean;
  currency: string;
  labelText: string;
  testIDForAmount?: (amount: number) => string;
}

const ThresholdRadioList: React.FC<ThresholdRadioListProps> = ({
  selected,
  onChange,
  isDisabled,
  currency,
  labelText,
  testIDForAmount,
}) => (
  <Box>
    <Box twClassName="px-4 pt-4 pb-2">
      <Text
        variant={TextVariant.BodyMd}
        color={isDisabled ? TextColor.TextMuted : TextColor.TextDefault}
      >
        {labelText}
      </Text>
    </Box>
    {TX_AMOUNT_THRESHOLDS.map((amount) => (
      <ThresholdRow
        key={amount}
        label={formatThreshold(amount, currency)}
        isChecked={selected === amount}
        isDisabled={isDisabled}
        onPress={() => onChange(amount)}
        testID={testIDForAmount?.(amount)}
      />
    ))}
  </Box>
);

export default ThresholdRadioList;
