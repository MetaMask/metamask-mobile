import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { configureStore } from '@reduxjs/toolkit';
import OnboardingNavigator from './OnboardingNavigator';

jest.mock('./hooks/useGeoRewardsMetadata');

jest.mock('../../Views/UnmountOnBlur', () => {
  const ReactActual = jest.requireActual('react');
  return function MockUnmountOnBlur({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return ReactActual.createElement(
      'div',
      { 'data-testid': 'unmount-on-blur' },
      children,
    );
  };
});

jest.mock('./components/Onboarding/OnboardingMainStep', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockOnboardingMainStep() {
      return ReactActual.createElement(
        View,
        { testID: 'rewards-onboarding-main-step' },
        ReactActual.createElement(Text, null, 'Onboarding Main Step'),
      );
    },
  };
});

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../reducers/rewards/selectors', () => ({
  selectOnboardingActiveStep: jest.fn(),
  selectOptinAllowedForGeo: jest.fn(),
}));

const mockUseGeoRewardsMetadata = jest.fn();

jest.mock('./hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: () => mockUseGeoRewardsMetadata(),
}));

describe('OnboardingNavigator', () => {
  let store: ReturnType<typeof configureStore>;
  const Stack = createStackNavigator();

  const createMockStore = () =>
    configureStore({
      reducer: {
        rewards: (
          state = {
            onboardingActiveStep: 'INTRO',
            optinAllowedForGeo: true,
          },
        ) => state,
        engine: (
          state = {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-account-id',
                  accounts: {
                    'test-account-id': {
                      id: 'test-account-id',
                      address: '0x123',
                    },
                  },
                },
              },
            },
          },
        ) => state,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockStore();
    mockUseGeoRewardsMetadata.mockReturnValue(undefined);
  });

  const renderWithNavigation = (component: React.ReactElement) =>
    render(
      <Provider store={store}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Test">{() => component}</Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>,
    );

  it('renders OnboardingMainStep as the single screen', async () => {
    const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

    await waitFor(() => {
      expect(getByTestId('rewards-onboarding-main-step')).toBeOnTheScreen();
    });
  });

  it('renders without errors', () => {
    const component = renderWithNavigation(<OnboardingNavigator />);
    expect(component).toBeTruthy();
  });
});
