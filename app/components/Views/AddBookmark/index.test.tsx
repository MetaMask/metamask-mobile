import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from 'styled-components/native';
import { mockTheme } from '../../../util/theme';
import AddBookmark from './';

describe('AddBookmark', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeProvider theme={mockTheme}>
        <AddBookmark
          navigation={{ setOptions: () => null }}
          route={{ params: {} }}
          theme={mockTheme}
        />
      </ThemeProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
