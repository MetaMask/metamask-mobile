// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

import {
  TEST_NOTIFICATIONS_ACTION,
  TEST_NOTIFICATIONS_ICON_NAME,
} from './BadgeNotifications.constants';

// Internal dependencies.
import BadgeNotifications from './BadgeNotifications';

describe('BadgeNotifications', () => {
  it('should render badge notifications correctly', () => {
    const { toJSON } = render(
      <BadgeNotifications
        testID={TEST_NOTIFICATIONS_ACTION}
        iconName={TEST_NOTIFICATIONS_ICON_NAME}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
