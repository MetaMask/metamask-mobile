import React from 'react';
import { render } from '@testing-library/react-native';
import AddBookmark from './';
import { ThemeContext, mockTheme } from '../../../util/theme';

describe('AddBookmark', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <AddBookmark
          navigation={{ setOptions: () => null }}
          route={{ params: {} }}
        />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
