import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import OnboardingIntroStep from '../OnboardingIntroStep';
import { renderWithProviders, createMockDispatch } from '../testUtils';
import Routes from '../../../../../../constants/navigation/Routes';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock redux
const mockDispatch = createMockDispatch();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: jest.fn((selector) => {
    const state = {
      rewards: {
        optinAllowedForGeo: true,
        optinAllowedForGeoLoading: false,
      },
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'test-account',
              accounts: {
                'test-account': {
                  type: 'eip155:eoa',
                },
              },
            },
          },
        },
      },
    };
    return selector(state);
  }),
}));

// Mock multichain utils
jest.mock('../../../../../../core/Multichain/utils', () => ({
  isSolanaAccount: jest.fn(() => false),
}));

// Tailwind mock is handled in test-utils.ts

// Mock strings
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => `mocked_${key}`,
}));

describe('OnboardingIntroStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<OnboardingIntroStep />);
      expect(screen.getByTestId('onboarding-intro-container')).toBeDefined();
    });

    it('should render intro title and description', () => {
      renderWithProviders(<OnboardingIntroStep />);

      expect(
        screen.getByText('mocked_rewards.onboarding.intro_title_1'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.intro_title_2'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.intro_description'),
      ).toBeDefined();
    });

    it('should render confirm and skip buttons', () => {
      renderWithProviders(<OnboardingIntroStep />);

      expect(
        screen.getByText('mocked_rewards.onboarding.intro_confirm'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.intro_skip'),
      ).toBeDefined();
    });

    it('should render intro image', () => {
      renderWithProviders(<OnboardingIntroStep />);

      const introImage = screen.getByTestId('intro-image');
      expect(introImage).toBeDefined();
    });
  });

  describe('user interactions', () => {
    it('should handle skip button press', () => {
      renderWithProviders(<OnboardingIntroStep />);

      const skipButton = screen.getByText(
        'mocked_rewards.onboarding.intro_skip',
      );
      fireEvent.press(skipButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('should handle next button press when geo is allowed and account is valid', () => {
      renderWithProviders(<OnboardingIntroStep />);

      const confirmButton = screen.getByText(
        'mocked_rewards.onboarding.intro_confirm',
      );
      fireEvent.press(confirmButton);

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_ONBOARDING_1);
    });
  });

  describe('loading states', () => {
    it('should show loading state when checking geo permissions', () => {
      const mockSelectorWithLoading = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: true,
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-account',
                  accounts: {
                    'test-account': {
                      type: 'eip155:eoa',
                    },
                  },
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockImplementation(mockSelectorWithLoading);

      renderWithProviders(<OnboardingIntroStep />);

      const confirmButton = screen.getByText(
        'mocked_rewards.onboarding.intro_confirm_geo_loading',
      );
      expect(confirmButton).toBeDefined();
    });
  });

  describe('account validation', () => {
    it('should show error modal for Solana accounts', () => {
      // Reset the mock to ensure it returns true for this test
      const mockIsSolanaAccount = jest.requireMock(
        '../../../../../../core/Multichain/utils',
      ).isSolanaAccount as jest.Mock;
      mockIsSolanaAccount.mockClear();
      mockIsSolanaAccount.mockReturnValue(true);

      // Ensure we have a valid account for the Solana check
      const mockUseSelectorSolana = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorSolana.mockImplementation((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-account',
                  accounts: {
                    'test-account': {
                      type: 'solana:mainnet',
                      address: 'solana-address',
                    },
                  },
                },
              },
            },
          },
        };
        return selector(state);
      });

      renderWithProviders(<OnboardingIntroStep />);

      const confirmButton = screen.getByText(
        'mocked_rewards.onboarding.intro_confirm',
      );
      fireEvent.press(confirmButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_ERROR_MODAL,
        {
          title: 'mocked_rewards.onboarding.not_supported_account_needed_title',
          description:
            'mocked_rewards.onboarding.not_supported_account_needed_description',
          dismissLabel: 'mocked_rewards.onboarding.not_supported_confirm',
        },
      );
    });

    it('should show error modal when geo is not allowed', () => {
      // Ensure Solana account check returns false so geo check is reached
      const mockIsSolanaAccount = jest.requireMock(
        '../../../../../../core/Multichain/utils',
      ).isSolanaAccount as jest.Mock;
      mockIsSolanaAccount.mockClear();
      mockIsSolanaAccount.mockReturnValue(false);

      const mockSelectorWithGeoBlocked = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: false,
            optinAllowedForGeoLoading: false,
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-account',
                  accounts: {
                    'test-account': {
                      type: 'eip155:eoa',
                    },
                  },
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorGeoBlocked = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorGeoBlocked.mockImplementation(mockSelectorWithGeoBlocked);

      renderWithProviders(<OnboardingIntroStep />);

      const confirmButton = screen.getByText(
        'mocked_rewards.onboarding.intro_confirm',
      );
      fireEvent.press(confirmButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_ERROR_MODAL,
        {
          title: 'mocked_rewards.onboarding.not_supported_region_title',
          description:
            'mocked_rewards.onboarding.not_supported_region_description',
          dismissLabel: 'mocked_rewards.onboarding.not_supported_confirm',
        },
      );
    });
  });

  describe('edge cases', () => {
    it('should handle missing account gracefully', () => {
      const mockSelectorWithNoAccount = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: null,
                  accounts: {},
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorNoAccount = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorNoAccount.mockImplementation(mockSelectorWithNoAccount);

      renderWithProviders(<OnboardingIntroStep />);

      const confirmButton = screen.getByText(
        'mocked_rewards.onboarding.intro_confirm',
      );
      fireEvent.press(confirmButton);

      // Should still proceed with onboarding when no account
      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
