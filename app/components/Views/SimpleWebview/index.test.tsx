import React from 'react';
import { render } from '@testing-library/react-native';
import SimpleWebview from './';
import { ThemeContext, mockTheme } from '../../../util/theme';

describe('SimpleWebview', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <SimpleWebview
          navigation={{
            setParams: () => {
              ('');
            },
            setOptions: () => null,
          }}
          route={{
            params: { url: 'https://etherscan.io', title: 'etherscan' },
          }}
        />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
