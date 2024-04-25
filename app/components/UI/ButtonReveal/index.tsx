import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { fontStyles } from '../../../styles/common';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../../util/theme';

const radius = 14;
const strokeWidth = 2;
const iconSize = radius - 4;
const innerRadius = radius - strokeWidth / 2;
const circumference = 2 * Math.PI * innerRadius;

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 99,
    },
    progressContainer: {
      height: radius * 2,
      width: radius * 2,
      marginRight: 12,
    },
    absoluteFillWithCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    absoluteFill: {
      ...StyleSheet.absoluteFillObject,
    },
    preCompletedContainerStyle: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius,
      backgroundColor: colors.primary.default,
    },
    outerCircle: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius,
      backgroundColor: colors.primary.inverse,
    },
    innerCircle: {
      flex: 1,
      borderRadius: radius - strokeWidth,
      margin: strokeWidth,
      backgroundColor: colors.primary.default,
    },
    label: {
      color: colors.primary.inverse,
      fontSize: 18,
      ...(fontStyles.normal as any),
    },
    animatedCircle: {
      transform: [
        {
          rotate: '-90deg',
        },
      ],
    },
  });

interface Props {
  onPress: () => void;
  label: string;
}

const ButtonReveal = ({ onPress, label }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={1}>
      <View style={[styles.container]}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default ButtonReveal;
