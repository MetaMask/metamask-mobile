import React from 'react';
import { Dimensions, View } from 'react-native';
import { useAppTheme } from '../../app/util/theme';

import ThemeProvider from '../../app/component-library/providers/ThemeProvider/ThemeProvider';

const withTheme = (storyFn: () => React.ReactNode) => {
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
  const theme = useAppTheme();

  return (
    <ThemeProvider>
      <View
        style={{
          width: windowWidth,
          height: windowHeight,
          backgroundColor: theme.colors.background.alternative,
        }}
      >
        {storyFn()}
      </View>
    </ThemeProvider>
  );
};

export default withTheme;
