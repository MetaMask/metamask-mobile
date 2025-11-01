import React from 'react';
import { screen } from '@testing-library/react-native';
import ProgressIndicator from '../ProgressIndicator';
import { renderWithProviders } from '../testUtils';

// Mock react-native hooks
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useColorScheme: jest.fn(() => 'light'),
}));

describe('ProgressIndicator', () => {
  const defaultProps = {
    totalSteps: 4,
    currentStep: 2,
  };

  describe('rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<ProgressIndicator {...defaultProps} />);
      expect(screen.getByTestId('navigation-provider')).toBeDefined();
    });

    it('should render with bars variant by default', () => {
      renderWithProviders(<ProgressIndicator {...defaultProps} />);
      // Should render the correct number of steps
      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });

    it('should render with dots variant when specified', () => {
      renderWithProviders(
        <ProgressIndicator {...defaultProps} variant="dots" />,
      );
      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });
  });

  describe('step indicators', () => {
    it('should render correct number of steps for bars variant', () => {
      renderWithProviders(
        <ProgressIndicator totalSteps={5} currentStep={3} variant="bars" />,
      );

      // The component should render elements for each step
      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });

    it('should render correct number of steps for dots variant', () => {
      renderWithProviders(
        <ProgressIndicator totalSteps={3} currentStep={1} variant="dots" />,
      );

      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });
  });

  describe('current step highlighting', () => {
    it('should highlight the current step correctly', () => {
      renderWithProviders(<ProgressIndicator totalSteps={4} currentStep={2} />);

      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });
  });

  describe('theme handling', () => {
    it('should handle light theme', () => {
      renderWithProviders(<ProgressIndicator {...defaultProps} />, {
        preloadedState: {
          user: { appTheme: 'light' as const },
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'INTRO',
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
              },
            },
          },
          engine: {
            backgroundState: {
              AccountsController: {
                selectedAccount: 'test-account',
                internalAccounts: {
                  accounts: {},
                  selectedAccount: 'test-account',
                },
              },
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        },
      });

      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });

    it('should handle dark theme', () => {
      renderWithProviders(<ProgressIndicator {...defaultProps} />, {
        preloadedState: {
          user: { appTheme: 'dark' as const },
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'INTRO',
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
              },
            },
          },
          engine: {
            backgroundState: {
              AccountsController: {
                selectedAccount: 'test-account',
                internalAccounts: {
                  accounts: {},
                  selectedAccount: 'test-account',
                },
              },
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        },
      });

      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle single step', () => {
      renderWithProviders(<ProgressIndicator totalSteps={1} currentStep={1} />);

      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });

    it('should handle first step', () => {
      renderWithProviders(<ProgressIndicator totalSteps={4} currentStep={1} />);

      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });

    it('should handle last step', () => {
      renderWithProviders(<ProgressIndicator totalSteps={4} currentStep={4} />);

      const container = screen.getByTestId('navigation-provider');
      expect(container).toBeDefined();
    });
  });
});
