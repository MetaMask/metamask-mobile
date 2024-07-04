// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// External dependencies.
import { BadgeVariant } from './Badge.types';
import { SAMPLE_BADGENETWORK_PROPS } from './variants/BadgeNetwork/BadgeNetwork.constants';
import { SAMPLE_BADGESTATUS_PROPS } from './variants/BadgeStatus/BadgeStatus.constants';

// Internal dependencies.
import Badge from './Badge';
import {
  BADGE_BADGENETWORK_TEST_ID,
  BADGE_BADGESTATUS_TEST_ID,
  BADGE_BADGENOTIFICATIONS_TEST_ID,
} from './Badge.constants';

describe('Badge', () => {
  it('should render badge network given the badge network variant', () => {
    const { toJSON } = render(
      <Badge {...SAMPLE_BADGENETWORK_PROPS} variant={BadgeVariant.Network} />,
    );
    expect(toJSON()).toMatchSnapshot();
    const contentElement = screen.getByTestId(BADGE_BADGENETWORK_TEST_ID);
    expect(contentElement).toBeTruthy();
  });

  it('should render badge status given the badge status variant', () => {
    const { toJSON } = render(
      <Badge {...SAMPLE_BADGESTATUS_PROPS} variant={BadgeVariant.Status} />,
    );
    expect(toJSON()).toMatchSnapshot();
    const contentElement = screen.getByTestId(BADGE_BADGESTATUS_TEST_ID);
    expect(contentElement).toBeTruthy();
  });

  it('should render badge notifications given the badge notification variant', () => {
    const { toJSON } = render(
      <Badge
        {...SAMPLE_BADGESTATUS_PROPS}
        variant={BadgeVariant.NotificationsKinds}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
    const contentElement = screen.getByTestId(BADGE_BADGENOTIFICATIONS_TEST_ID);
    expect(contentElement).toBeTruthy();
  });
});
