import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';

import AnnouncementsDetails from '.';
import { createStyles } from '../styles';
import MOCK_NOTIFICATIONS from '../../../../../components/UI/Notification/__mocks__/mock_notifications';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import { mockTheme } from '../../../../../util/theme';

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

describe('AnnouncementsDetails', () => {
  const mockStore = configureMockStore();
  const store = mockStore(mockInitialState);

  let navigation: NavigationProp<ParamListBase>;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let styles: Record<string, any>;
  beforeEach(() => {
    navigation = {
      navigate: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>;
    styles = createStyles(mockTheme);
  });

  it('should renders correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AnnouncementsDetails
          styles={styles}
          navigation={navigation}
          notification={MOCK_NOTIFICATIONS[0]}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
