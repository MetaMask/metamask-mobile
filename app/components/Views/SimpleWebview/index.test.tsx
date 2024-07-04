import React from 'react';
import { render } from '@testing-library/react-native';
import SimpleWebview from './';

describe('SimpleWebview', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <SimpleWebview
        navigation={{
          setParams: () => {
            ('');
          },
          setOptions: () => null,
        }}
        route={{ params: { url: 'https://etherscan.io', title: 'etherscan' } }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
