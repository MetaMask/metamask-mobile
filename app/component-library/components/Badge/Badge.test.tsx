import React from 'react';
import { shallow } from 'enzyme';
import Badge from './Badge';

describe('Badge', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Badge />);
    expect(wrapper).toMatchSnapshot();
  });
});
