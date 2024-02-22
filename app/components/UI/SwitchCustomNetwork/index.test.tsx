import React from 'react';
import SwitchCustomNetwork from './';
import { render } from '@testing-library/react-native';

describe('SwitchCustomNetwork', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <SwitchCustomNetwork
        customNetworkInformation={{ chainName: '', chainId: '' }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
