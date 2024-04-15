/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import BadgeNetwork from './variants/BadgeNetwork';
import BadgeStatus from './variants/BadgeStatus';
import BadgeNotifications from './variants/BadgeNotifications';

// Internal dependencies.
import { BadgeProps, BadgeVariant } from './Badge.types';
import {
  BADGE_BADGENETWORK_TEST_ID,
  BADGE_BADGESTATUS_TEST_ID,
  BADGE_BADGENOTIFICATIONS_TEST_ID,
} from './Badge.constants';

const Badge = ({ variant, ...props }: BadgeProps) => {
  switch (variant) {
    case BadgeVariant.Network:
      return <BadgeNetwork testID={BADGE_BADGENETWORK_TEST_ID} {...props} />;
    case BadgeVariant.Status:
      return <BadgeStatus testID={BADGE_BADGESTATUS_TEST_ID} {...props} />;
    case BadgeVariant.NotificationsKinds:
      return (
        <BadgeNotifications
          testID={BADGE_BADGENOTIFICATIONS_TEST_ID}
          {...props}
        />
      );
    default:
      throw new Error('Invalid Badge Variant');
  }
};

export default Badge;
