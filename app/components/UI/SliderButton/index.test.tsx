import React from 'react';
import { shallow } from 'enzyme';
import SliderButton from './index';

describe('SliderButton', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <SliderButton
        incompleteText="Incomplete Text"
        completeText="Complete Text"
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
