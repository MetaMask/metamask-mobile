// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { BadgeVariants } from '../../Badge.types';
import { TEST_AVATAR_PROPS } from './BadgeAvatar.constants';

// Internal dependencies.
import BadgeAvatar from './BadgeAvatar';
import { BADGE_AVATAR_TEST_ID } from '../../Badge.constants';

describe('BadgeAvatar - snapshots', () => {
  it('should render badge avatar', () => {
    const wrapper = shallow(
      <BadgeAvatar
        variant={BadgeVariants.Avatar}
        avatarProps={TEST_AVATAR_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('BadgeAvatar', () => {
  it('should render badge avatar with the given content', () => {
    const wrapper = shallow(
      <BadgeAvatar
        variant={BadgeVariants.Avatar}
        avatarProps={TEST_AVATAR_PROPS}
      />,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_AVATAR_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
