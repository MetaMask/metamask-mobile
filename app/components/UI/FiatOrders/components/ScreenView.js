import React from 'react';
import { SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
  });

const ScreenView = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView {...props} />
    </SafeAreaView>
  );
};

export default ScreenView;
