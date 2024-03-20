// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

import {
  TEST_NOTIFICATIONS_ACTION,
  TEST_RNOTIFICATIONS_ICON_NAME,
  BADGE_NOTIFICATIONS_TEST_ID,
} from './BadgeNotifications.constants';

// Internal dependencies.
import BadgeNotifications from './BadgeNotifications';

describe('BadgeNotifications - snapshots', () => {
  it('should render badge notifications correctly', () => {
    const wrapper = shallow(
      <BadgeNotifications
        name={TEST_NOTIFICATIONS_ACTION}
        iconName={TEST_RNOTIFICATIONS_ICON_NAME}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('BadgeNotifications', () => {
  it('should render badge notifications with the given content', () => {
    const wrapper = shallow(
      <BadgeNotifications
        name={TEST_NOTIFICATIONS_ACTION}
        iconName={TEST_RNOTIFICATIONS_ICON_NAME}
      />,
    );

    const contentElement = wrapper.findWhere(
      (node) => node.prop('testID') === BADGE_NOTIFICATIONS_TEST_ID,
    );
    expect(contentElement.exists()).toBe(true);
  });
});
