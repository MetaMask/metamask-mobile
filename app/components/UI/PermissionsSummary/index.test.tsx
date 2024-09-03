import React from 'react';
import PermissionsSummary from './';
import renderWithProvider from '../../../util/test/renderWithProvider';

describe('SwitchCustomNetwork', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <PermissionsSummary
        customNetworkInformation={{ chainName: '', chainId: '' }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
