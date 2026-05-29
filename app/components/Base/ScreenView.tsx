import type { ThemeColors } from '@metamask/design-tokens';
import React from 'react';
import { StyleSheet, ScrollView, View, ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../util/theme';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
  });

interface ScreenViewProps extends ScrollViewProps {
  children: React.ReactNode;
  /**
   * Safe-area edges applied by the internal SafeAreaView wrapper.
   * Defaults to `['bottom', 'left', 'right']` for backwards compatibility.
   * Pass `[]` when an ancestor SafeAreaView already handles the insets to
   * avoid double padding.
   */
  safeAreaEdges?: readonly Edge[];
}

const ScreenView: React.FC<ScreenViewProps> = ({
  safeAreaEdges = ['bottom', 'left', 'right'],
  ...props
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (safeAreaEdges.length === 0) {
    return (
      <View style={styles.wrapper}>
        <ScrollView {...props} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper} edges={safeAreaEdges}>
      <ScrollView {...props} />
    </SafeAreaView>
  );
};

export default ScreenView;
