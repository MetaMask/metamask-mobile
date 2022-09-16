import React from 'react';
import { shallow } from 'enzyme';
import InvalidCustomNetworkAlert from '.';

describe('InvalidCustomNetworkAlert', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<InvalidCustomNetworkAlert />);
    expect(wrapper).toMatchSnapshot();
  });
});
