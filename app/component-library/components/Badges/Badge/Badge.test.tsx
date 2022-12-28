// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { BadgeVariants } from './Badge.types';
import {
  TEST_NETWORK_NAME,
  TEST_REMOTE_IMAGE_SOURCE,
} from '../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';

// Internal dependencies.
import Badge from './Badge';
import { BADGE_NETWORK_TEST_ID } from './Badge.constants';

describe('Badge - snapshots', () => {
  it('should render badge network given the badge network variant', () => {
    const wrapper = shallow(
      <Badge
        variant={BadgeVariants.Network}
        name={TEST_NETWORK_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Badge', () => {
  it('should render badge network given the badge network variant', () => {
    const wrapper = shallow(
      <Badge
        variant={BadgeVariants.Network}
        name={TEST_NETWORK_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_NETWORK_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
