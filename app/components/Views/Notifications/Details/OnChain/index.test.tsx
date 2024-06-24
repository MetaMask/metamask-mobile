import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';

import OnChainDetails from '.';
import { createStyles } from '../styles';
import MOCK_NOTIFICATIONS from '../../../../../components/UI/Notification/__mocks__/mock_notifications';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import { mockTheme } from '../../../../../util/theme';
import { HalRawNotification } from '../../../../../util/notifications/types';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';

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
const accountAvatarType = AvatarAccountType.Blockies;
const copyToClipboard = jest.fn();

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

describe('OnChainDetails', () => {
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
        <OnChainDetails
          notification={MOCK_NOTIFICATIONS[1] as HalRawNotification}
          styles={styles}
          theme={mockTheme}
          accountAvatarType={accountAvatarType}
          navigation={navigation}
          copyToClipboard={copyToClipboard}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the notification details correctly', () => {
    const { getByText } = render(
      <Provider store={store}>
        <OnChainDetails
          notification={MOCK_NOTIFICATIONS[1] as HalRawNotification}
          styles={styles}
          theme={mockTheme}
          accountAvatarType={accountAvatarType}
          navigation={navigation}
          copyToClipboard={copyToClipboard}
        />
      </Provider>,
    );
    expect(getByText('Liquid staked Ether 2.0')).toBeTruthy();
  });
});
