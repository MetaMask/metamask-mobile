import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text';
import { ThemeColors } from '@metamask/design-tokens';
import { NftDetailsBoxProps } from './NftDetails.types';

import Pressable from '../../../component-library/components-temp/Pressable';
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    inputWrapper: {
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.default,
      flexGrow: 1,
      width: '33%',
    },
    valueWithIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
  });

const NftDetailsBox = (props: NftDetailsBoxProps) => {
  const {
    title,
    titleStyle,
    titleTextStyle,
    value,
    valueStyle,
    valueTextStyle,
    icon,
    onValuePress,
  } = props;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (!value) {
    return null;
  }

  return (
    <View style={[styles.inputWrapper]}>
      <View style={titleStyle}>
        <Text style={titleTextStyle}>{title}</Text>
      </View>
      {icon ? (
        <View style={styles.valueWithIcon}>
          {onValuePress ? (
            <Pressable onPress={onValuePress}>
              <Text style={valueTextStyle}>{value}</Text>
            </Pressable>
          ) : (
            <Text style={valueTextStyle}>{value}</Text>
          )}
          {icon}
        </View>
      ) : (
        <View style={valueStyle}>
          <Text style={valueTextStyle}>{value}</Text>
        </View>
      )}
    </View>
  );
};
export default NftDetailsBox;
