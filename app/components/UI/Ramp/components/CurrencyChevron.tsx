import React from 'react';
import { StyleSheet, View } from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';
import Text from '../../../Base/Text';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    chevron: {
      marginLeft: 10,
      color: colors.icon.default,
    },
  });

interface Props {
  currency?: string;
}

const CurrencyChevron = ({ currency, ...props }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View {...props}>
      <Text black>
        <Text black bold>
          {currency}
        </Text>
        {'  '}
        <Entypo name="chevron-down" size={16} style={styles.chevron} />
      </Text>
    </View>
  );
};

export default CurrencyChevron;
