import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PickComponent from './';
import { ThemeContext } from '../../../util/theme';

const mockTheme = {
  colors: {},
  themeAppearance: 'light',
};

describe('PickComponent', () => {
  it('should render correctly', () => {
    render(
      <ThemeContext.Provider value={mockTheme}>
        <PickComponent
          textFirst={'Text First'}
          valueFirst={'valueFirst'}
          textSecond={'Text Second'}
          valueSecond={'valueSecond'}
          selectedValue={'valueSecond'}
        />
      </ThemeContext.Provider>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
