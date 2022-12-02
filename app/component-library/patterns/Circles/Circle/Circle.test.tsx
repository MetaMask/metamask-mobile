// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import CirclePattern from './Circle';
import { CirclePatternSizes } from './Circle.types';
import { CIRCLE_PATTERN_TEST_ID } from './Circle.constants';

describe('CirclePattern - Snapshot', () => {
  it('should render CirclePattern correctly', () => {
    const wrapper = shallow(
      <CirclePattern size={CirclePatternSizes.Md}>
        <View />
      </CirclePattern>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CirclePattern', () => {
  it('should render CirclePattern component', () => {
    const wrapper = shallow(
      <CirclePattern size={CirclePatternSizes.Md}>
        <View />
      </CirclePattern>,
    );
    const circlePatternComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CIRCLE_PATTERN_TEST_ID,
    );
    expect(circlePatternComponent.exists()).toBe(true);
  });
});
