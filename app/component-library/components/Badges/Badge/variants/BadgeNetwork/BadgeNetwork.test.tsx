// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import {
  SAMPLE_AVATARNETWORK_NAME,
  SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL,
} from '../../../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';

// Internal dependencies.
import BadgeNetwork from './BadgeNetwork';
import { BADGE_NETWORK_TEST_ID } from './BadgeNetwork.constants';

describe('BadgeNetwork - snapshots', () => {
  it('should render badge network correctly', () => {
    const { toJSON } = render(
      <BadgeNetwork
        name={SAMPLE_AVATARNETWORK_NAME}
        imageSource={SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('BadgeNetwork', () => {
  it('should render badge network with the given content', () => {
    const { toJSON } = render(
      <BadgeNetwork
        name={SAMPLE_AVATARNETWORK_NAME}
        imageSource={SAMPLE_AVATARNETWORK_IMAGESOURCE_LOCAL}
      />,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_NETWORK_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
