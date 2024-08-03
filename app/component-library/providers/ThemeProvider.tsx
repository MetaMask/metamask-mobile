// Third party dependencies
import React from 'react';
import { Dimensions, View } from 'react-native';

// External dependencies
import { useAppTheme, ThemeContext } from '../../util/theme';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  const theme = useAppTheme();
  return (
    <ThemeContext.Provider value={theme}>
      <View
        style={{
          width: windowWidth,
          height: windowHeight,
          backgroundColor: theme.colors.background.alternative,
        }}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
