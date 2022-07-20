import React from 'react';
import { shallow } from 'enzyme';
import NetworkPicker from './NetworkPicker';
import { testImageUrl } from './NetworkPicker.data';

describe('NetworkPicker', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <NetworkPicker
        onPress={jest.fn}
        networkLabel={'Ethereum Mainnet'}
        networkImageUrl={testImageUrl}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
