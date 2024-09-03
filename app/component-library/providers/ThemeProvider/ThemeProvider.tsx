// Third party dependencies
import React from 'react';
import { Dimensions, View } from 'react-native';

// External dependencies
import { useAppTheme, ThemeContext } from '../../../util/theme';

// Internal dependencies
import { THEMEPROVIDER_TESTID } from './ThemeProvider.constants';

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
        testID={THEMEPROVIDER_TESTID}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
