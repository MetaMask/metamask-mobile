// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

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
    const { toJSON } = render(
      <BadgeWrapper badgeProps={badgeProps}>
        <Tag label={'Children'} />
      </BadgeWrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('BadgeWrapper', () => {
  it('should render badge with the given content', () => {
    const { findByText } = render(
      <BadgeWrapper badgeProps={badgeProps}>
        <Tag label={'Children'} />
      </BadgeWrapper>,
    );

    expect(findByText('Children')).toBeTruthy();
  });
});
