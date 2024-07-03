import React from 'react';
import { render } from '@testing-library/react-native';
import PickComponent from './';
import { ThemeProvider } from 'styled-components/native';
import { mockTheme } from '../../../util/theme';

describe('PickComponent', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeProvider theme={mockTheme}>
        <PickComponent
          textFirst={'Text First'}
          valueFirst={'valueFirst'}
          textSecond={'Text Second'}
          valueSecond={'valueSecond'}
          selectedValue={'valueSecond'}
        />
      </ThemeProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
