/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import BadgeNetwork from './variants/BadgeNetwork';
import BadgeStatus from './variants/BadgeStatus';

// Internal dependencies.
import { BadgeProps, BadgeVariant } from './Badge.types';
import {
  BADGE_BADGENETWORK_TEST_ID,
  BADGE_BADGESTATUS_TEST_ID,
} from './Badge.constants';

const Badge = (badgeProps: BadgeProps) => {
  switch (badgeProps.variant) {
    case BadgeVariant.Network:
      return (
        <BadgeNetwork
          testID={BADGE_BADGENETWORK_TEST_ID}
          {...badgeProps}
          variant={BadgeVariant.Network}
        />
      );
    case BadgeVariant.Status:
      return (
        <BadgeStatus
          testID={BADGE_BADGESTATUS_TEST_ID}
          {...badgeProps}
          variant={BadgeVariant.Status}
        />
      );
    default:
      throw new Error('Invalid Badge Variant');
  }
};

export default Badge;
