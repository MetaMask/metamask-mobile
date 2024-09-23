import React from 'react';
import SwitchCustomNetwork from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('SwitchCustomNetwork', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <SwitchCustomNetwork
        customNetworkInformation={{ chainName: '', chainId: '' }}
        currentPageInformation={{ url: 'https://app.uniswap.org/' }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
