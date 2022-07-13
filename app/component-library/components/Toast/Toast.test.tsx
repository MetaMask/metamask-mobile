import React from 'react';
import { shallow } from 'enzyme';
import Toast from './Toast';

describe('Toast', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Toast />);
    expect(wrapper).toMatchSnapshot();
  });
});
