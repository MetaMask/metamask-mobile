// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { BadgeVariants } from './Badge.types';
import {
  TEST_NETWORK_NAME,
  TEST_REMOTE_IMAGE_SOURCE,
} from '../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';

// Internal dependencies.
import Badge from './Badge';

describe('Badge', () => {
  it('should render badge network given the badge network variant', () => {
    const { toJSON } = render(
      <Badge
        variant={BadgeVariants.Network}
        name={TEST_NETWORK_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
