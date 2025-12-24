import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import {
  INotification,
  TRIGGER_TYPES,
  processNotification,
} from '@metamask/notification-services-controller/notification-services';
import {
  createMockNotificationERC20Received,
  createMockNotificationERC20Sent,
  createMockNotificationEthReceived,
  createMockNotificationEthSent,
} from '@metamask/notification-services-controller/notification-services/mocks';

import NotificationsDetails from './index';
import { backgroundState } from '../../../../util/test/initial-root-state';
import MOCK_NOTIFICATIONS from '../../../../components/UI/Notification/__mocks__/mock_notifications';
// eslint-disable-next-line import/no-namespace
import * as UseNotificationsModule from '../../../../util/notifications/hooks/useNotifications';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';

jest.mock('../../../../util/notifications/constants/config', () => ({
  ...jest.requireActual('../../../../util/notifications/constants/config'),
  isNotificationsFeatureEnabled: () => true,
}));

const mockInitialState = {
  settings: {
    avatarAccountType: AvatarAccountType.Maskicon,
  },
  engine: {
    backgroundState,
  },
};

jest.mock('../../../../actions/alert', () => ({
  showAlert: jest.fn(),
}));

jest.mock('@react-navigation/native');
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

describe('NotificationsDetails', () => {
  const mockStore = configureMockStore();
  const store = mockStore(mockInitialState);

  let navigation: NavigationProp<ParamListBase>;

  beforeEach(() => {
    navigation = {
      navigate: jest.fn(),
      setOptions: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;

    jest
      .spyOn(UseNotificationsModule, 'useMarkNotificationAsRead')
      .mockReturnValue({ markNotificationAsRead: jest.fn(), loading: false });
  });

  const renderDetailsPage = (notification: INotification) =>
    render(
      <Provider store={store}>
        <NotificationsDetails
          navigation={navigation}
          route={{ params: { notification } }}
        />
      </Provider>,
    );

  it('shows the details page with valid notification', () => {
    const { getByTestId } = renderDetailsPage(MOCK_NOTIFICATIONS[1]);

    expect(getByTestId('notification-details')).toBeOnTheScreen();
  });

  const nullTests = [
    { type: 'Invalid-Notification' } as unknown as INotification,
    ...[
      processNotification(createMockNotificationEthSent()),
      processNotification(createMockNotificationEthReceived()),
      processNotification(createMockNotificationERC20Sent()),
      processNotification(createMockNotificationERC20Received()),
    ].map((n) => {
      if (
        n.type === TRIGGER_TYPES.ETH_SENT ||
        n.type === TRIGGER_TYPES.ETH_RECEIVED ||
        n.type === TRIGGER_TYPES.ERC20_SENT ||
        n.type === TRIGGER_TYPES.ERC20_RECEIVED
      ) {
        n.payload.chain_id = 123; // unsupported chainId
      }
      return n;
    }),
  ];

  it.each(nullTests)(
    'returns null on invalid notifications - $type',
    (notification) => {
      const result = renderDetailsPage(notification);

      expect(result.toJSON()).toBe(null);
    },
  );
});
