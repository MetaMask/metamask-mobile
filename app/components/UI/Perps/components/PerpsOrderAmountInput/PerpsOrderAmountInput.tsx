import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { createStyles } from './PerpsOrderAmountInput.styles';

interface PerpsOrderAmountInputProps {
  amount: string;
  asset: string;
  positionSize: string;
}

const PerpsOrderAmountInput: React.FC<PerpsOrderAmountInputProps> = ({
  amount,
  asset,
  positionSize,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text
        variant={TextVariant.DisplayMD}
        color={TextColor.Default}
        style={styles.amountDisplay}
      >
        ${amount}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Muted}
        style={styles.cryptoAmount}
      >
        {positionSize} {asset}
      </Text>
    </View>
  );
};

export default PerpsOrderAmountInput;
