import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '@react-navigation/native';

interface RoundBtnProps {
  icon: IconName;
  text: string;
  onPress?: () => void;
}

const styleSheet = (colors: any) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: 10,
    },
    circle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.primary.default,
    },
  });

const RoundBtn = ({ icon, text, onPress }: RoundBtnProps) => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.circle}>
        <Icon name={icon} size={IconSize.Sm} color={IconColor.Info} />
      </View>
      <Text style={styles.label}>{text}</Text>
    </TouchableOpacity>
  );
};

export default RoundBtn;
