import React from 'react';
import { shallow } from 'enzyme';
import CustomAlert from './';

describe('CustomAlert', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<CustomAlert />);
    expect(wrapper).toMatchSnapshot();
  });
});
