import React from 'react';
import { shallow } from 'enzyme';
import CustomNonce from './';

describe('CustomNonce', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<CustomNonce />);
    expect(wrapper).toMatchSnapshot();
  });
});
