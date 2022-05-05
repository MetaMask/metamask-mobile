import React from 'react';
import { shallow } from 'enzyme';
import BaseText from './BaseText';

describe('BaseText', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<BaseText />);
    expect(wrapper).toMatchSnapshot();
  });
});
