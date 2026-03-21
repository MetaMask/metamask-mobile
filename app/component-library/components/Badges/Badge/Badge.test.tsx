// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// External dependencies.
import { BadgeVariant } from './Badge.types';
import { SAMPLE_BADGENETWORK_PROPS, BADGENETWORK_TEST_ID } from './variants/BadgeNetwork/BadgeNetwork.constants';
import { SAMPLE_BADGESTATUS_PROPS, BADGE_STATUS_TEST_ID } from './variants/BadgeStatus/BadgeStatus.constants';
import { SAMPLE_BADGENOTIFICATIONS_PROPS } from './variants/BadgeNotifications/BadgeNotifications.constants';

// Internal dependencies.
import Badge from './Badge';
import {
  BADGE_BADGENOTIFICATIONS_TEST_ID,
} from './Badge.constants';

describe('Badge', () => {
  it('should render badge network given the badge network variant', () => {
    const { toJSON } = render(
      <Badge {...SAMPLE_BADGENETWORK_PROPS} variant={BadgeVariant.Network} />,
    );
    expect(toJSON()).toMatchSnapshot();
    expect(screen.getByTestId(BADGENETWORK_TEST_ID)).toBeDefined();
  });

  it('should render badge status given the badge status variant', () => {
    const { toJSON } = render(
      <Badge {...SAMPLE_BADGESTATUS_PROPS} variant={BadgeVariant.Status} />,
    );
    expect(toJSON()).toMatchSnapshot();
    expect(screen.getByTestId(BADGE_STATUS_TEST_ID)).toBeDefined();
  });

  it('should render badge notifications given the badge notification variant', () => {
    const { toJSON } = render(
      <Badge
        {...SAMPLE_BADGENOTIFICATIONS_PROPS}
        variant={BadgeVariant.NotificationsKinds}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
    expect(screen.getByTestId(BADGE_BADGENOTIFICATIONS_TEST_ID)).toBeDefined();
  });
});
