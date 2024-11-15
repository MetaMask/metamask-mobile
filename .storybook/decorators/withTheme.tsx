import React from 'react';
import ThemeProvider from '../../app/component-library/providers/ThemeProvider/ThemeProvider';

const withTheme = (storyFn: () => React.ReactNode) => (
  <ThemeProvider>{storyFn()}</ThemeProvider>
);

export default withTheme;
