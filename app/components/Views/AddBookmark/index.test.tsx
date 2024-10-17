import React from 'react';
import { screen, render } from '@testing-library/react-native';
import AddBookmark from './';
import { ThemeContext } from '../../../util/theme';

const mockTheme = {
  colors: {
    background: { default: 'white' },
    border: { default: 'red' },
    text: { default: 'black' },
    error: { default: 'red' },
    warning: { default: 'yellow' },
    primary: { default: 'blue', inverse: 'orange' },
    overlay: { inverse: 'blue' },
  },
  themeAppearance: 'light',
};

describe('AddBookmark', () => {
  it('should render correctly', () => {
    render(
      <ThemeContext.Provider value={mockTheme}>
        <AddBookmark
          navigation={{ setOptions: () => null }}
          route={{ params: {} }}
        />
      </ThemeContext.Provider>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
