// // Third party dependencies.
// import React from 'react';
// import { render } from '@testing-library/react-native';

// import {
//   TEST_NOTIFICATIONS_ACTION,
//   TEST_RNOTIFICATIONS_ICON_NAME,
//   BADGE_NOTIFICATIONS_TEST_ID,
// } from './BadgeNotifications.constants';

// // Internal dependencies.
// import BadgeNotifications from './BadgeNotifications';

// describe('BadgeNotifications - snapshots', () => {
//   it('should render badge notifications correctly', () => {
//     const { toJSON } = render(
//       <BadgeNotifications
//         testID={TEST_NOTIFICATIONS_ACTION}
//         iconName={TEST_RNOTIFICATIONS_ICON_NAME}
//       />,
//     );
//     expect(toJSON()).toMatchSnapshot();
//   });
// });

// describe('BadgeNotifications', () => {
//   it('should render badge notifications with the given content', () => {
//     const { findByTestId } = render(
//       <BadgeNotifications
//         testID={TEST_NOTIFICATIONS_ACTION}
//         iconName={TEST_RNOTIFICATIONS_ICON_NAME}
//       />,
//     );

//     expect(findByTestId(BADGE_NOTIFICATIONS_TEST_ID)).toBeTruthy();
//   });
// });
