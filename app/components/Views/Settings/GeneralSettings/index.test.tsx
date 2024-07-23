import React from 'react';
import { render } from '@testing-library/react-native';
import GeneralSettings from './';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import {
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { Provider } from 'react-redux';

// Mocking the react-native-modal and DeviceEventEmitter used in the GeneralSettings component
jest.mock(
  'react-native-modal',
  () =>
    function MockModal() {
      return null;
    },
);

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    DeviceEventEmitter: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      emit: jest.fn(),
    },
  };
});

// Mock navigation prop
const mockNavigation: Partial<NavigationProp<ParamListBase>> = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

// Mock initial state
const mockBackgroundState = {
  NetworkController: {
    provider: {
      type: 'mainnet',
    },
  },
  AccountTrackerController: {
    accounts: {
      '0x0000000000000000000000000000000000000000': {
        balance: '0x0',
        address: '0x0000000000000000000000000000000000000000',
      },
    },
  },
  AccountsController: {
    internalAccounts: {
      selectedAccount: '0x0000000000000000000000000000000000000000',
      accounts: {
        '0x0000000000000000000000000000000000000000': {
          address: '0x0000000000000000000000000000000000000000',
          balance: '0x0',
          name: 'Account 1',
        },
      },
    },
  },
};

const mockInitialState = {
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'DuckDuckGo',
    useBlockieIcon: true,
  },
  engine: {
    backgroundState: mockBackgroundState,
  },
  user: { appTheme: 'light' },
  metamask: { selectedAddress: '0x0000000000000000000000000000000000000000' },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((selector) => selector(mockInitialState)),
  useDispatch: () => jest.fn(),
  useStore: () => ({
    getState: () => mockInitialState,
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  }),
}));

describe('GeneralSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={jest.requireMock('react-redux').useStore()}>
        <ThemeContext.Provider value={mockTheme}>
          <GeneralSettings navigation={mockNavigation} />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
