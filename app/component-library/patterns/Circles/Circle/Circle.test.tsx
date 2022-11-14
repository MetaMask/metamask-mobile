// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// External dependencies.
import { TEST_BADGE_PROPS } from '../../../components/Badges/BadgeWrapper/BadgeWrapper.constants';

// Internal dependencies.
import CirclePattern from './Circle';
import { CirclePatternSizes } from './Circle.types';
import {
  CIRCLE_PATTERN_TEST_ID,
  CIRCLE_PATTERN_BADGE_TEST_ID,
} from './Circle.constants';

describe('CirclePattern - Snapshot', () => {
  it('should render CirclePattern correctly', () => {
    const wrapper = shallow(
      <CirclePattern size={CirclePatternSizes.Md}>
        <View />
      </CirclePattern>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CirclePattern with Badge correctly', () => {
    const wrapper = shallow(
      <CirclePattern size={CirclePatternSizes.Md} badgeProps={TEST_BADGE_PROPS}>
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

  it('should render CirclePattern component with badge if badgeProps is given', () => {
    const wrapper = shallow(
      <CirclePattern size={CirclePatternSizes.Md} badgeProps={TEST_BADGE_PROPS}>
        <View />
      </CirclePattern>,
    );
    const circlePatternBadgeComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CIRCLE_PATTERN_BADGE_TEST_ID,
    );
    expect(circlePatternBadgeComponent.exists()).toBe(true);
  });
});
