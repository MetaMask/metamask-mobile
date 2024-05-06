import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

import NotificationsView from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import MOCK_NOTIFICATIONS from '../../../components/UI/Notification/__mocks__/mock_notifications';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  settings: {
    useBlockieIcon: false,
  },
  notificationsSettings: {
    isEnabled: true,
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
};
jest.mock('@react-navigation/native');

describe('NotificationsView', () => {
  let navigation: NavigationProp<ParamListBase>;

  beforeEach(() => {
    navigation = {
      navigate: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsView
        navigation={navigation}
        selectedAddress={'0x123123123'}
        notifications={MOCK_NOTIFICATIONS}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot without notifications', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsView
        navigation={navigation}
        selectedAddress={'0x123123123'}
        notifications={[]}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
