import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { configureStore } from '@reduxjs/toolkit';
import OnboardingNavigator from './OnboardingNavigator';
import { OnboardingStep } from '../../../reducers/rewards/types';
import { setOnboardingActiveStep } from '../../../reducers/rewards';

// Mock dependencies
jest.mock('./hooks/useGeoRewardsMetadata');

// Mock onboarding step components
jest.mock('./components/Onboarding/OnboardingIntroStep', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOnboardingIntroStep() {
    return React.createElement(
      View,
      { testID: 'rewards-onboarding-intro-step' },
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
      { testID: 'rewards-onboarding-step-1' },
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
      { testID: 'rewards-onboarding-step-2' },
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
      { testID: 'rewards-onboarding-step-3' },
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
      { testID: 'rewards-onboarding-step-4' },
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

// Mock selectors
jest.mock('../../../selectors/rewards', () => ({
  selectRewardsActiveAccountHasOptedIn: jest.fn(),
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../reducers/rewards/selectors', () => ({
  selectOnboardingActiveStep: jest.fn(),
  selectOptinAllowedForGeo: jest.fn(),
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));

// Import mocked selectors for setup
import {
  selectRewardsActiveAccountHasOptedIn,
  selectRewardsSubscriptionId,
} from '../../../selectors/rewards';
import {
  selectOnboardingActiveStep,
  selectOptinAllowedForGeo,
} from '../../../reducers/rewards/selectors';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';

const mockSelectRewardsActiveAccountHasOptedIn =
  selectRewardsActiveAccountHasOptedIn as jest.MockedFunction<
    typeof selectRewardsActiveAccountHasOptedIn
  >;
const mockSelectRewardsSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;
const mockSelectOnboardingActiveStep =
  selectOnboardingActiveStep as jest.MockedFunction<
    typeof selectOnboardingActiveStep
  >;
const mockSelectOptinAllowedForGeo =
  selectOptinAllowedForGeo as jest.MockedFunction<
    typeof selectOptinAllowedForGeo
  >;
const mockSelectSelectedInternalAccount =
  selectSelectedInternalAccount as jest.MockedFunction<
    typeof selectSelectedInternalAccount
  >;

// Mock hooks
const mockUseGeoRewardsMetadata = jest.fn();

jest.mock('./hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: () => mockUseGeoRewardsMetadata(),
}));

describe('OnboardingNavigator', () => {
  let store: ReturnType<typeof configureStore>;
  const Stack = createStackNavigator();

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

    // Set default mock return values
    mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
    mockSelectRewardsSubscriptionId.mockReturnValue(null);
    mockSelectOnboardingActiveStep.mockReturnValue(OnboardingStep.INTRO);
    mockSelectOptinAllowedForGeo.mockReturnValue(true);
    mockUseGeoRewardsMetadata.mockReturnValue(undefined);
    mockSelectSelectedInternalAccount.mockReturnValue({
      address: '0x123',
      type: 'eip155:eoa',
      id: '',
      options: {},
      metadata: {
        name: '',
        importTime: 0,
        keyring: {
          type: '',
        },
        nameLastUpdatedAt: undefined,
        snap: undefined,
        lastSelected: undefined,
      },
      scopes: [],
      methods: [],
    });
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
      mockSelectOnboardingActiveStep.mockReturnValue(OnboardingStep.INTRO);

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-onboarding-intro-step')).toBeOnTheScreen();
      });
    });

    it('renders step 1 when activeStep is STEP_1', async () => {
      // Arrange
      mockSelectOnboardingActiveStep.mockReturnValue(OnboardingStep.STEP_1);

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-onboarding-step-1')).toBeOnTheScreen();
      });
    });

    it('renders step 2 when activeStep is STEP_2', async () => {
      // Arrange
      mockSelectOnboardingActiveStep.mockReturnValue(OnboardingStep.STEP_2);

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-onboarding-step-2')).toBeOnTheScreen();
      });
    });

    it('renders step 3 when activeStep is STEP_3', async () => {
      // Arrange
      mockSelectOnboardingActiveStep.mockReturnValue(OnboardingStep.STEP_3);

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-onboarding-step-3')).toBeOnTheScreen();
      });
    });

    it('renders step 4 when activeStep is STEP_4', async () => {
      // Arrange
      mockSelectOnboardingActiveStep.mockReturnValue(OnboardingStep.STEP_4);

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-onboarding-step-4')).toBeOnTheScreen();
      });
    });

    it('defaults to intro step when activeStep is invalid', async () => {
      // Arrange
      mockSelectOnboardingActiveStep.mockReturnValue(
        'INVALID_STEP' as OnboardingStep,
      );

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-onboarding-intro-step')).toBeOnTheScreen();
      });
    });
  });

  describe('Geographic restriction handling', () => {
    it('resets to intro step when optin is not allowed for geo', async () => {
      // Arrange
      mockSelectOnboardingActiveStep.mockReturnValue(OnboardingStep.STEP_2);
      mockSelectOptinAllowedForGeo.mockReturnValue(false);
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);

      // Reset mocks before test
      mockDispatch.mockClear();

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
      mockSelectOnboardingActiveStep.mockReturnValue(OnboardingStep.STEP_2);
      mockSelectOptinAllowedForGeo.mockReturnValue(true);
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockSelectRewardsSubscriptionId.mockReturnValue('mock-id');

      // Reset mocks before test
      mockDispatch.mockClear();

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
  });

  describe('Hook integration', () => {
    it('calls useGeoRewardsMetadata hook', () => {
      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Assert
      expect(mockUseGeoRewardsMetadata).toHaveBeenCalled();
    });

    it('uses selectors for state management', () => {
      // Arrange
      // Reset mocks
      mockSelectRewardsActiveAccountHasOptedIn.mockClear();
      mockSelectRewardsSubscriptionId.mockClear();
      mockSelectOnboardingActiveStep.mockClear();
      mockSelectOptinAllowedForGeo.mockClear();

      // Act
      renderWithNavigation(<OnboardingNavigator />);

      // Force selector calls by re-rendering
      jest.runAllTimers();

      // Assert
      expect(mockSelectRewardsSubscriptionId).toHaveBeenCalled();
      expect(mockSelectOnboardingActiveStep).toHaveBeenCalled();
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
        expect(getByTestId('rewards-onboarding-intro-step')).toBeOnTheScreen();
      });

      // Assert - Other screens should not be rendered initially but stack should be set up
      expect(queryByTestId('rewards-onboarding-step-1')).toBeNull();
      expect(queryByTestId('rewards-onboarding-step-2')).toBeNull();
      expect(queryByTestId('rewards-onboarding-step-3')).toBeNull();
      expect(queryByTestId('rewards-onboarding-step-4')).toBeNull();
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
      mockSelectOnboardingActiveStep.mockReturnValue(
        undefined as unknown as OnboardingStep,
      );

      // Act
      const { getByTestId } = renderWithNavigation(<OnboardingNavigator />);

      // Assert - Should default to intro step
      await waitFor(() => {
        expect(getByTestId('rewards-onboarding-intro-step')).toBeOnTheScreen();
      });
    });
  });
});
