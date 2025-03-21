// Third party dependencies
import React from 'react';

// External dependencies
import { useAppTheme, ThemeContext } from '../../../util/theme';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useAppTheme();
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

export default ThemeProvider;
