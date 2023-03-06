/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import BadgeNetwork from './variants/BadgeNetwork';
import BadgeStatus from './variants/BadgeStatus';

// Internal dependencies.
import { BadgeProps, BadgeVariants } from './Badge.types';
import { BADGE_NETWORK_TEST_ID } from './Badge.constants';

const Badge = (badgeProps: BadgeProps) => {
  switch (badgeProps.variant) {
    case BadgeVariants.Network:
      return <BadgeNetwork testID={BADGE_NETWORK_TEST_ID} {...badgeProps} />;
    case BadgeVariants.Status:
      return <BadgeStatus {...badgeProps} />;
    default:
      throw new Error('Invalid Badge Variant');
  }
};

export default Badge;
