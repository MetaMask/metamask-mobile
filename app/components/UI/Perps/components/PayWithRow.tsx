import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import TokenIcon from '../../Swaps/components/TokenIcon';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

interface PayWithRowProps {
  selectedToken: {
    symbol: string;
    iconUrl?: string;
  };
  tokenAmount: string;
  onPress: () => void;
  testID?: string;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginVertical: 24,
    },
    label: {
      flex: 0,
      marginRight: 16,
    },
    amountText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '500',
    },
    tokenSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background.alternative,
      borderRadius: 20,
    },
  });

const PayWithRow: React.FC<PayWithRowProps> = ({
  selectedToken,
  tokenAmount,
  onPress,
  testID = 'pay-with-row',
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container} testID={testID}>
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Muted}
        style={styles.label}
      >
        PAY WITH
      </Text>

      <Text
        variant={TextVariant.BodyLGMedium}
        style={styles.amountText}
      >
        {tokenAmount} {selectedToken.symbol}
      </Text>

      <TouchableOpacity style={styles.tokenSelector} onPress={onPress}>
        <TokenIcon
          medium
          icon={selectedToken.iconUrl}
          symbol={selectedToken.symbol}
        />
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Xs}
          color={IconColor.Primary}
        />
      </TouchableOpacity>
    </View>
  );
};

export default PayWithRow;
