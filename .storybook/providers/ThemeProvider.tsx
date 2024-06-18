import React from 'react';
import { ThemeContext, useAppTheme } from '../../app/util/theme';
import { View } from 'react-native';
import { Dimensions } from 'react-native';

const ThemeProvider: React.FC = ({ children }) => {
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  const theme = useAppTheme();

  return (
    <ThemeContext.Provider value={theme}>
      <View
        style={{
          backgroundColor: theme.colors.background.alternative,
          width: windowWidth,
          height: windowHeight,
        }}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
