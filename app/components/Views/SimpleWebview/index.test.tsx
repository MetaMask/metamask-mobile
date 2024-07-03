import React from 'react';
import { render } from '@testing-library/react-native';
import SimpleWebview from './';
import { ThemeProvider } from 'styled-components/native';
import { mockTheme } from '../../../util/theme';

describe('SimpleWebview', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeProvider theme={mockTheme}>
        <SimpleWebview
          navigation={{
            setParams: () => {
              ('');
            },
            setOptions: () => null,
          }}
          route={{
            params: {
              url: 'https://etherscan.io',
              title: 'etherscan',
            },
          }}
        />
      </ThemeProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
