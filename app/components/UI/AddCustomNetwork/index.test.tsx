import React from 'react';
import AddCustomNetwork from './';
import { render } from '@testing-library/react-native';

describe('AddCustomNetwork', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <AddCustomNetwork
        customNetworkInformation={{ chainName: '', chainId: '' }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
