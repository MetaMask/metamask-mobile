import React from 'react';
import { shallow } from 'enzyme';
import WalletConnectSessions from './';

describe('WalletConnectSessions', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <WalletConnectSessions navigation={{ setOptions: () => null }} />,
    );

    expect(wrapper).toMatchSnapshot();
  });
});
