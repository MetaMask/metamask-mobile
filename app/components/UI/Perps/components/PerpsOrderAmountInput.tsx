import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

interface PerpsOrderAmountInputProps {
  amount: string;
  asset: string;
  positionSize: string;
}

const createStyles = (_colors: Colors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    amountDisplay: {
      fontSize: 48,
      fontWeight: '700',
    },
    cryptoAmount: {
      marginTop: 8,
    },
  });

const PerpsOrderAmountInput: React.FC<PerpsOrderAmountInputProps> = ({
  amount,
  asset,
  positionSize,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.DisplayMD} color={TextColor.Default} style={styles.amountDisplay}>
        ${amount}
      </Text>
      <Text variant={TextVariant.BodyMD} color={TextColor.Muted} style={styles.cryptoAmount}>
        {positionSize} {asset}
      </Text>
    </View>
  );
};

export default PerpsOrderAmountInput;
