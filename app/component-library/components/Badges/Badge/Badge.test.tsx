// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { BadgeVariants } from './Badge.types';
import { TEST_AVATAR_PROPS } from './variants/BadgeAvatar/BadgeAvatar.constants';

// Internal dependencies.
import Badge from './Badge';
import { BADGE_AVATAR_TEST_ID } from './Badge.constants';

describe('Badge - snapshots', () => {
  it('should render badge avatar given the badge avatar variant', () => {
    const wrapper = shallow(
      <Badge variant={BadgeVariants.Avatar} avatarProps={TEST_AVATAR_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Badge', () => {
  it('should render badge avatar given the badge avatar variant', () => {
    const wrapper = shallow(
      <Badge variant={BadgeVariants.Avatar} avatarProps={TEST_AVATAR_PROPS} />,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_AVATAR_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
