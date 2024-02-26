import React from 'react';
import { View, StyleSheet } from 'react-native';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';

interface Props {
  percentComplete: number;
}

const borderRadius = 5;

const ProgressBar = ({ percentComplete }: Props) => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    container: {
      height: 5,
      width: '80%',
      borderRadius,
      backgroundColor: colors.background.pressed,
    },
    progressBar: {
      height: '100%',
      borderRadius,
      backgroundColor: colors.primary.default,
      width: `${percentComplete}%`,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.progressBar} />
    </View>
  );
};

export default ProgressBar;
