import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../app/util/theme';

import ThemeProvider from '../../app/component-library/providers/ThemeProvider/ThemeProvider';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const withTheme = (Story: React.ComponentType) => {
  const theme = useAppTheme();

  return (
    <ThemeProvider>
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background.alternative },
        ]}
      >
        <Story />
      </View>
    </ThemeProvider>
  );
};

export default withTheme;
