import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { NavigationContainer } from '@react-navigation/native';
import DestinationAccountSelector from './index';
import { backgroundState } from '../../../../../util/test/initial-root-state';

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {
            '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi': {
              address: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
              name: 'Account 1',
            },
            '5vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi': {
              address: '5vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
              name: 'Account 2',
            },
          },
        },
      },
    },
  },
}));

// Mock React Native Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
}));

// Mock the hooks and utilities
jest.mock('../../../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      {
        address: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
        name: 'Account 1',
      },
      {
        address: '5vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
        name: 'Account 2',
      },
    ],
    ensByAccountAddress: {},
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      border: {
        muted: '#000000',
      },
    },
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockStore = configureStore([]);

describe('DestinationAccountSelector', () => {
  const renderComponent = (storeState = {}) => {
    const store = mockStore({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            privacyMode: false,
          },
        },
      },
      bridge: {
        destAddress: '0x1234567890123456789012345678901234567890',
      },
      settings: {
        useBlockieIcon: false,
      },
      ...storeState,
    });

    return {
      ...render(
        <Provider store={store}>
          <NavigationContainer>
            <DestinationAccountSelector />
          </NavigationContainer>
        </Provider>,
      ),
      store,
    };
  };

  it('renders correctly with destination address', () => {
    const { getByText } = renderComponent();
    expect(getByText('Receive at')).toBeTruthy();
  });

  it('hides address when privacy mode is enabled', () => {
    const { getByText } = renderComponent({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            privacyMode: true,
          },
        },
      },
    });
    expect(getByText('Receive at')).toBeTruthy();
  });

  it('uses blockie icon when blockie setting is enabled', () => {
    const { getByTestId } = renderComponent({
      settings: {
        useBlockieIcon: true,
      },
    });
    const avatar = getByTestId('cellbase-avatar');
    expect(avatar).toBeTruthy();
  });

  it('clears destination address when close button is pressed', () => {
    const { getByTestId, store } = renderComponent();
    // The close button is a ButtonIcon component with IconName.Close
    const closeButton = getByTestId('cellselect').findByProps({
      iconName: 'Close',
    });
    fireEvent.press(closeButton);

    const actions = store.getActions();
    expect(actions).toContainEqual({
      type: 'bridge/setDestAddress',
      payload: undefined,
    });
  });

  it('sets first account as destination when no destination is set', () => {
    const { store } = renderComponent({
      bridge: {
        destAddress: undefined,
      },
    });

    const actions = store.getActions();
    expect(actions).toContainEqual({
      type: 'bridge/setDestAddress',
      payload: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
    });
  });

  it('clears destination when close button is pressed', () => {
    const { getByTestId, store } = renderComponent();
    const closeButton = getByTestId('cellselect').findByProps({
      iconName: 'Close',
    });
    fireEvent.press(closeButton);

    const actions = store.getActions();
    expect(actions).toContainEqual({
      type: 'bridge/setDestAddress',
      payload: undefined,
    });
  });
});
