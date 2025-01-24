import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { View } from 'react-native';

const PercentageChange = ({ value }: { value: number | null | undefined }) => {
  const percentageColorText =
    value && value >= 0 ? TextColor.Success : TextColor.Error;

  const isValidAmount = (amount: number | null | undefined): boolean =>
    amount !== null && amount !== undefined && !Number.isNaN(amount);

  const formattedValue = isValidAmount(value)
    ? `${(value as number) >= 0 ? '+' : ''}${(value as number).toFixed(2)}%`
    : '';

  return (
    <View>
      <Text color={percentageColorText} variant={TextVariant.BodyMDMedium}>
        {formattedValue}
      </Text>
    </View>
  );
};

export default PercentageChange;
