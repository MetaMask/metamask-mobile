import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

import NotificationsView from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
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
      <NotificationsView navigation={navigation} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot without notifications', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsView navigation={navigation} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
