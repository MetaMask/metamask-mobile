import React from 'react';
import { shallow } from 'enzyme';
import FadeOutOverlay from './';

describe('FadeOutOverlay', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<FadeOutOverlay />);
    expect(wrapper).toMatchSnapshot();
  });
});
