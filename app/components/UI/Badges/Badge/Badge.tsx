/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import BadgeAvatar from './variants/BadgeAvatar';

// Internal dependencies.
import { BadgeProps, BadgeVariants } from './Badge.types';
import { BADGE_AVATAR_TEST_ID } from './Badge.constants';

const Badge = (badgeProps: BadgeProps) => {
  switch (badgeProps.variant) {
    case BadgeVariants.Avatar:
      return <BadgeAvatar testID={BADGE_AVATAR_TEST_ID} {...badgeProps} />;
    default:
      throw new Error('Invalid Badge Variant');
  }
};

export default Badge;
