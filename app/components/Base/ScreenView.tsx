import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import React from 'react';
import { SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../util/theme';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
  });

const ScreenView: React.FC = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView {...props} />
    </SafeAreaView>
  );
};

export default ScreenView;
