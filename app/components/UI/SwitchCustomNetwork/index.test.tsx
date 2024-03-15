import React from 'react';
import SwitchCustomNetwork from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('SwitchCustomNetwork', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <SwitchCustomNetwork
        customNetworkInformation={{ chainName: '', chainId: '' }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
