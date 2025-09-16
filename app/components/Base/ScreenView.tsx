import type { ThemeColors } from '@metamask/design-tokens';
import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../util/theme';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
  });

interface ScreenViewProps {
  children: React.ReactNode;
}

const ScreenView: React.FC<ScreenViewProps> = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.wrapper} edges={['bottom', 'left', 'right']}>
      <ScrollView {...props} />
    </SafeAreaView>
  );
};

export default ScreenView;
