import React from 'react';
import { shallow } from 'enzyme';
import AnimatedSpinner from './';

describe('AnimatedSpinner', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<AnimatedSpinner />);
    expect(wrapper).toMatchSnapshot();
  });
});
