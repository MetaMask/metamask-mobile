import React, { ComponentType } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
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

interface EntypoProps {
  name: string;
  size: number;
  style: StyleProp<ViewStyle>;
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
        {React.createElement(Entypo as unknown as ComponentType<EntypoProps>, {
          name: 'chevron-down',
          size: 16,
          style: styles.chevron,
        })}
      </Text>
    </View>
  );
};

export default CurrencyChevron;
