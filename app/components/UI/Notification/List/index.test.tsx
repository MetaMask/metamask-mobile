import React from 'react';
import NotificationsList from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import MOCK_NOTIFICATIONS from '../__mocks__/mock_notifications';
const navigationMock = {
  navigate: jest.fn(),
};
describe('NotificationsList', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsList
        navigation={navigationMock}
        allNotifications={MOCK_NOTIFICATIONS}
        walletNotifications={[MOCK_NOTIFICATIONS[1]]}
        announcementsNotifications={[MOCK_NOTIFICATIONS[0]]}
        loading
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
