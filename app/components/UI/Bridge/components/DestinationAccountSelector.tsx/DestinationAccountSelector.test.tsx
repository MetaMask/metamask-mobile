import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { NavigationContainer } from '@react-navigation/native';
import DestinationAccountSelector from './index';
import { backgroundState } from '../../../../../util/test/initial-root-state';

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
        address: '0x1234567890123456789012345678901234567890',
        name: 'Account 1',
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
  it('renders correctly', () => {
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
    });

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <DestinationAccountSelector />
        </NavigationContainer>
      </Provider>,
    );

    // Verify that the component renders with the expected text
    expect(getByText('Receive at')).toBeTruthy();
  });
}); 