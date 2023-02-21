// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import Tag from '../../Tags/Tag';
import { BadgeProps, BadgeVariants } from '../Badge/Badge.types';
import {
  TEST_NETWORK_NAME,
  TEST_REMOTE_IMAGE_SOURCE,
} from '../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';

// Internal dependencies.
import BadgeWrapper from './BadgeWrapper';
import { BADGE_WRAPPER_BADGE_TEST_ID } from './BadgeWrapper.constants';

const badgeProps: BadgeProps = {
  variant: BadgeVariants.Network,
  name: TEST_NETWORK_NAME,
  imageSource: TEST_REMOTE_IMAGE_SOURCE,
};

describe('BadgeWrapper - snapshots', () => {
  it('should render badge with default position correctly', () => {
    const wrapper = shallow(
      <BadgeWrapper badgeProps={badgeProps}>
        <Tag label={'Children'} />
      </BadgeWrapper>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('BadgeWrapper', () => {
  it('should render badge with the given content', () => {
    const wrapper = shallow(
      <BadgeWrapper badgeProps={badgeProps}>
        <Tag label={'Children'} />
      </BadgeWrapper>,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_WRAPPER_BADGE_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
