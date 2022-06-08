import React from 'react';
import { shallow } from 'enzyme';
import FadeView from './';

describe('FadeView', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<FadeView visible />);
    expect(wrapper).toMatchSnapshot();
  });
});
