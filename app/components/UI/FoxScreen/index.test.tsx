import React from 'react';
import { shallow } from 'enzyme';
import FoxScreen from './';

describe('FoxScreen', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<FoxScreen />);
    expect(wrapper).toMatchSnapshot();
  });
});
