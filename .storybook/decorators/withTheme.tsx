import React from 'react';
import ThemeProvider from '../providers/ThemeProvider';

const withTheme = (story: any) => <ThemeProvider>{story()}</ThemeProvider>;

export default withTheme;
