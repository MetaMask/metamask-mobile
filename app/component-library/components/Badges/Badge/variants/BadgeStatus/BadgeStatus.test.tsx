// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { BadgeVariants } from '../../Badge.types';
import {
  TEST_NETWORK_NAME,
  TEST_REMOTE_IMAGE_SOURCE,
} from '../../../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';

// Internal dependencies.
import BadgeStatus from './BadgeStatus';
import { BADGE_NETWORK_TEST_ID } from '../../Badge.constants';
import { BadgeStatusPosition } from './BadgeStatus.types';

describe('BadgeStatus - snapshots', () => {
  it('should render badge network with default position correctly', () => {
    const wrapper = shallow(
      <BadgeStatus
        variant={BadgeVariants.Network}
        name={TEST_NETWORK_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render badge network with bottom right position correctly', () => {
    const wrapper = shallow(
      <BadgeStatus
        variant={BadgeVariants.Network}
        name={TEST_NETWORK_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
        position={BadgeStatusPosition.BottomRight}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('BadgeStatus', () => {
  it('should render badge network with the given content', () => {
    const wrapper = shallow(
      <BadgeStatus
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
