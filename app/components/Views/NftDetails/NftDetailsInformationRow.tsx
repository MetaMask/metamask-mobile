import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import { NftDetailsInformationRowProps } from './NftDetails.types';
import TouchableOpacity from '../../Base/TouchableOpacity';

const createStyles = () =>
  StyleSheet.create({
    inputWrapper: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 4,
      flexDirection: 'row',
    },
    valueWithIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
  });

const NftDetailsInformationRow = ({
  title,
  titleStyle,
  value,
  valueStyle,
  icon,
  onValuePress,
}: NftDetailsInformationRowProps) => {
  const styles = createStyles();

  if (!value) {
    return null;
  }

  return (
    <View style={[styles.inputWrapper]}>
      <Text style={titleStyle}>{title}</Text>
      {icon ? (
        <View style={styles.valueWithIcon}>
          {onValuePress ? (
            <TouchableOpacity onPress={onValuePress}>
              <Text style={valueStyle}>{value}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={valueStyle}>{value}</Text>
          )}
          {icon}
        </View>
      ) : (
        <Text style={valueStyle}>{value}</Text>
      )}
    </View>
  );
};
export default NftDetailsInformationRow;
