import React from 'react';
import { shallow } from 'enzyme';
import ActionView from './';

describe('ActionView', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<ActionView />);
    expect(wrapper).toMatchSnapshot();
  });
});
