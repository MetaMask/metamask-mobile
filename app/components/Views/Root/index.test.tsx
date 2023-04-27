import React from 'react';
import { shallow } from 'enzyme';
import Root from './';

describe('Root', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Root />);
    expect(wrapper).toMatchSnapshot();
  });
});
