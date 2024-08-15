// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Notifications team directory
import React from 'react';
import NotificationsList from './';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import MOCK_NOTIFICATIONS from '../__mocks__/mock_notifications';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

const navigationMock = {
  navigate: jest.fn(),
} as unknown as NavigationProp<ParamListBase>;

describe('NotificationsList', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsList
        navigation={navigationMock}
        allNotifications={MOCK_NOTIFICATIONS}
        walletNotifications={[MOCK_NOTIFICATIONS[1]]}
        web3Notifications={[MOCK_NOTIFICATIONS[0]]}
        loading
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
