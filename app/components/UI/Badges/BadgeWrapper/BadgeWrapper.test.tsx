// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { View } from 'react-native';

// Internal dependencies.
import BadgeWrapper from './BadgeWrapper';
import {
  BADGE_WRAPPER_BADGE_TEST_ID,
  TEST_BADGE_PROPS,
} from './BadgeWrapper.constants';

describe('BadgeWrapper - snapshots', () => {
  it('should render badge with default position correctly', () => {
    const wrapper = shallow(
      <BadgeWrapper badgeProps={TEST_BADGE_PROPS}>
        <View />
      </BadgeWrapper>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('BadgeWrapper', () => {
  it('should render badge with the given content', () => {
    const wrapper = shallow(
      <BadgeWrapper badgeProps={TEST_BADGE_PROPS}>
        <View />
      </BadgeWrapper>,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_WRAPPER_BADGE_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
