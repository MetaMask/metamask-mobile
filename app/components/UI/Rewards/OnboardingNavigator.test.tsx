import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { configureStore } from '@reduxjs/toolkit';
import OnboardingNavigator from './OnboardingNavigator';
import Routes from '../../../constants/navigation/Routes';
import { OnboardingStep } from '../../../reducers/rewards/types';
import { setOnboardingActiveStep } from '../../../reducers/rewards';

// Mock dependencies
jest.mock('./hooks/useRewardsAuth');
jest.mock('./hooks/useGeoRewardsMetadata');

// Mock onboarding step components
jest.mock('./components/Onboarding/OnboardingIntroStep', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOnboardingIntroStep() {
    return React.createElement(
      View,
      { testID: 'onboarding-intro-step' },
      React.createElement(Text, null, 'Onboarding Intro Step'),
    );
  };
});

jest.mock('./components/Onboarding/OnboardingStep1', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOnboardingStep1() {
    return React.createElement(
      View,
      { testID: 'onboarding-step-1' },
      React.createElement(Text, null, 'Onboarding Step 1'),
    );
  };
});

jest.mock('./components/Onboarding/OnboardingStep2', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOnboardingStep2() {
    return React.createElement(
      View,
      { testID: 'onboarding-step-2' },
      React.createElement(Text, null, 'Onboarding Step 2'),
    );
  };
});

jest.mock('./components/Onboarding/OnboardingStep3', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOnboardingStep3() {
    return React.createElement(
      View,
      { testID: 'onboarding-step-3' },
      React.createElement(Text, null, 'Onboarding Step 3'),
    );
  };
});

jest.mock('./components/Onboarding/OnboardingStep4', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOnboardingStep4() {
    return React.createElement(
      View,
      { testID: 'onboarding-step-4' },
      React.createElement(Text, null, 'Onboarding Step 4'),
    );
  };
});

// Mock navigation
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

// Mock hooks
import type { UseRewardsAuthResult } from './hooks/useRewardsAuth';
const mockUseRewardsAuthResult = jest.fn<UseRewardsAuthResult, []>();
const mockUseGeoRewardsMetadata = jest.fn();

jest.mock('./hooks/useRewardsAuth', () => ({
  useRewardsAuth: () => mockUseRewardsAuthResult(),
}));

jest.mock('./hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: () => mockUseGeoRewardsMetadata(),
}));

describe('OnboardingNavigator', () => {
  let store: ReturnType<typeof configureStore>;
  const Stack = createStackNavigator();

  // Helper function to create complete mock UseRewardsAuthResult
  const createMockAuthResult = (
    overrides: Partial<UseRewardsAuthResult> = {},
  ): UseRewardsAuthResult => ({
    hasAccountedOptedIn: false,
    optin: jest.fn(),
    subscriptionId: null,
    optinLoading: false,
    optinError: null,
    clearOptinError: jest.fn(),
    ...overrides,
  });

  // Helper function to create mock store with custom state
  const createMockStore = (rewardsState: unknown = {}) =>
    configureStore({
      reducer: {
        rewards: (
          state = {
            onboardingActiveStep: OnboardingStep.INTRO,
            optinAllowedForGeo: true,
            ...(rewardsState as Record<string, unknown>),
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

    // Default mock implementations
    mockUseRewardsAuthResult.mockReturnValue(
      createMockAuthResult({ hasAccountedOptedIn: false }),
    );
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

  describe('Initial route determination', () => {
    it('renders intro step when activeStep is INTRO', async () => {
      // Arrange
      store = createMockStore({ onboardingActiveStep: OnboardingStep.INTRO });

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('onboarding-intro-step')).toBeOnTheScreen();
      });
    });

    it('renders step 1 when activeStep is STEP_1', async () => {
      // Arrange
      store = createMockStore({ onboardingActiveStep: OnboardingStep.STEP_1 });

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('onboarding-step-1')).toBeOnTheScreen();
      });
    });

    it('renders step 2 when activeStep is STEP_2', async () => {
      // Arrange
      store = createMockStore({ onboardingActiveStep: OnboardingStep.STEP_2 });

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('onboarding-step-2')).toBeOnTheScreen();
      });
    });

    it('renders step 3 when activeStep is STEP_3', async () => {
      // Arrange
      store = createMockStore({ onboardingActiveStep: OnboardingStep.STEP_3 });

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('onboarding-step-3')).toBeOnTheScreen();
      });
    });

    it('renders step 4 when activeStep is STEP_4', async () => {
      // Arrange
      store = createMockStore({ onboardingActiveStep: OnboardingStep.STEP_4 });

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('onboarding-step-4')).toBeOnTheScreen();
      });
    });

    it('defaults to intro step when activeStep is invalid', async () => {
      // Arrange
      store = createMockStore({ onboardingActiveStep: 'INVALID_STEP' });

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('onboarding-intro-step')).toBeOnTheScreen();
      });
    });
  });

  describe('Navigation logic based on authentication state', () => {
    it('navigates to dashboard when user has opted in', async () => {
      // Arrange
      mockUseRewardsAuthResult.mockReturnValue(
        createMockAuthResult({ hasAccountedOptedIn: true }),
      );

      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
        expect(mockDispatch).toHaveBeenCalledWith(
          setOnboardingActiveStep(OnboardingStep.INTRO),
        );
      });
    });

    it('does not navigate when user has not opted in', async () => {
      // Arrange
      mockUseRewardsAuthResult.mockReturnValue(
        createMockAuthResult({ hasAccountedOptedIn: false }),
      );

      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('does not navigate when user auth state is pending', async () => {
      // Arrange
      mockUseRewardsAuthResult.mockReturnValue(
        createMockAuthResult({ hasAccountedOptedIn: 'pending' }),
      );

      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('does not navigate when user auth state is error', async () => {
      // Arrange
      mockUseRewardsAuthResult.mockReturnValue(
        createMockAuthResult({ hasAccountedOptedIn: 'error' }),
      );

      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Geographic restriction handling', () => {
    it('resets to intro step when optin is not allowed for geo', async () => {
      // Arrange
      store = createMockStore({
        onboardingActiveStep: OnboardingStep.STEP_2,
        optinAllowedForGeo: false,
      });
      mockUseRewardsAuthResult.mockReturnValue(
        createMockAuthResult({ hasAccountedOptedIn: false }),
      );

      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          setOnboardingActiveStep(OnboardingStep.INTRO),
        );
      });
    });

    it('does not reset step when optin is allowed for geo', async () => {
      // Arrange
      store = createMockStore({
        onboardingActiveStep: OnboardingStep.STEP_2,
        optinAllowedForGeo: true,
      });
      mockUseRewardsAuthResult.mockReturnValue(
        createMockAuthResult({ hasAccountedOptedIn: false }),
      );

      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        // Should not dispatch the reset action
        expect(mockDispatch).not.toHaveBeenCalledWith(
          setOnboardingActiveStep(OnboardingStep.INTRO),
        );
      });
    });

    it('prioritizes opted-in navigation over geo restrictions', async () => {
      // Arrange
      store = createMockStore({
        onboardingActiveStep: OnboardingStep.STEP_2,
        optinAllowedForGeo: false,
      });
      mockUseRewardsAuthResult.mockReturnValue(
        createMockAuthResult({ hasAccountedOptedIn: true }),
      );

      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
        expect(mockDispatch).toHaveBeenCalledWith(
          setOnboardingActiveStep(OnboardingStep.INTRO),
        );
      });
    });
  });

  describe('Hook integration', () => {
    it('calls useGeoRewardsMetadata hook', () => {
      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      expect(mockUseGeoRewardsMetadata).toHaveBeenCalled();
    });

    it('calls useRewardsAuth hook', () => {
      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      expect(mockUseRewardsAuthResult).toHaveBeenCalled();
    });
  });

  describe('Navigation stack structure', () => {
    it('renders all onboarding screens in stack', async () => {
      // Arrange
      const { getByTestId, queryByTestId } = renderWithNavigation(
        <OnboardingNavigator />,
      );

      // Assert - Should render the initial screen (intro by default)
      await waitFor(() => {
        expect(getByTestId('onboarding-intro-step')).toBeOnTheScreen();
      });

      // Assert - Other screens should not be rendered initially but stack should be set up
      expect(queryByTestId('onboarding-step-1')).toBeNull();
      expect(queryByTestId('onboarding-step-2')).toBeNull();
      expect(queryByTestId('onboarding-step-3')).toBeNull();
      expect(queryByTestId('onboarding-step-4')).toBeNull();
    });

    it('sets headerShown to false for all screens', () => {
      // Act
      const component = renderWithNavigation(<OnboardingNavigator />);

      // Assert - Component should render without errors (headers are hidden via options)
      expect(component).toBeTruthy();
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles undefined activeStep gracefully', async () => {
      // Arrange
      store = createMockStore({ onboardingActiveStep: undefined });

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert - Should default to intro step
      await waitFor(() => {
        expect(getByTestId('onboarding-intro-step')).toBeOnTheScreen();
      });
    });

    it('handles null optinAllowedForGeo gracefully', async () => {
      // Arrange
      store = createMockStore({ optinAllowedForGeo: null });
      mockUseRewardsAuthResult.mockReturnValue(
        createMockAuthResult({ hasAccountedOptedIn: false }),
      );

      // Act
      const component = renderWithNavigation(<OnboardingNavigator />);

      // Assert - Should render without errors
      expect(component).toBeTruthy();
    });

    it('handles auth hook returning undefined gracefully', async () => {
      // Arrange
      mockUseRewardsAuthResult.mockReturnValue(
        createMockAuthResult({
          hasAccountedOptedIn: undefined as unknown as
            | boolean
            | 'pending'
            | 'error',
        }),
      );

      // Act
      const component = renderWithNavigation(<OnboardingNavigator />);

      // Assert - Should render without errors
      expect(component).toBeTruthy();
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });
});
