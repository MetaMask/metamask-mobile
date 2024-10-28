import React from 'react';
import NotificationsList from './';
import renderWithProvider, { DeepPartial } from '../../../../util/test/renderWithProvider';
import MOCK_NOTIFICATIONS from '../__mocks__/mock_notifications';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import { createNavigationProps } from '../../../../util/testUtils';

const mockNavigation = createNavigationProps({});

jest.mock('@react-navigation/native', () => {
  const navigation = {
    params: {},
  };
  return {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...jest.requireActual<any>('@react-navigation/native'),
    useRoute: jest.fn(() => ({ params: navigation.params })),
    useNavigation: jest.fn(() => mockNavigation),
  };
});

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NotificationServicesController: {
        metamaskNotificationsList: [],
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (fn: any) => fn(mockInitialState),
}));

describe('NotificationsList', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsList
        navigation={mockNavigation}
        allNotifications={MOCK_NOTIFICATIONS}
        walletNotifications={[MOCK_NOTIFICATIONS[1]]}
        web3Notifications={[MOCK_NOTIFICATIONS[0]]}
        loading
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders empty state', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsList
        navigation={mockNavigation}
        allNotifications={[]}
        walletNotifications={[]}
        web3Notifications={[]}
        loading={false}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});


