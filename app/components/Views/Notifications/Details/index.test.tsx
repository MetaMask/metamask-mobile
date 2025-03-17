import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import NotificationsDetails from './index';
import { backgroundState } from '../../../../util/test/initial-root-state';
import MOCK_NOTIFICATIONS from '../../../../components/UI/Notification/__mocks__/mock_notifications';
// eslint-disable-next-line import/no-namespace
import * as NotificationStatesModule from '../../../../util/notifications/notification-states';
// eslint-disable-next-line import/no-namespace
import * as UseNotificationsModule from '../../../../util/notifications/hooks/useNotifications';

jest.mock('../../../../util/notifications/constants/config', () => ({
  ...jest.requireActual('../../../../util/notifications/constants/config'),
  isNotificationsFeatureEnabled: () => true,
}));

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
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

  it('renders correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <NotificationsDetails
          navigation={navigation}
          route={{
            params: {
              notification: MOCK_NOTIFICATIONS[1],
            },
          }}
        />
      </Provider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if unable to create modal state', () => {
    jest
      .spyOn(NotificationStatesModule, 'hasNotificationComponents')
      .mockReturnValue(false);

    const result = render(
      <Provider store={store}>
        <NotificationsDetails
          navigation={navigation}
          route={{
            params: {
              notification: MOCK_NOTIFICATIONS[1],
            },
          }}
        />
      </Provider>,
    );
    expect(result.toJSON()).toBe(null);
  });
});
