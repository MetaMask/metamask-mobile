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
  useFocusEffect: (callback: () => void) => {
    // Call the callback once to simulate component mount
    callback();
    return;
  },
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
        onboardingActiveStep: 'intro',
        candidateSubscriptionId: null,
        rewardsControllerState: {
          activeAccount: {
            subscriptionId: null,
            account: 'test-account',
            hasOptedIn: false,
          },
        },
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
          RewardsController: {
            activeAccount: {
              subscriptionId: null,
              account: 'test-account',
              hasOptedIn: false,
            },
          },
        },
      },
    };
    return selector(state);
  }),
}));

// Mock metrics
jest.mock('../../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn(),
      }),
    }),
  }),
}));

// Mock multichain utils
jest.mock('../../../../../../core/Multichain/utils', () => ({
  isSolanaAccount: jest.fn(() => false),
}));

// Mock useGeoRewardsMetadata hook
jest.mock('../../../hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: jest.fn(() => ({
    fetchGeoRewardsMetadata: jest.fn(),
  })),
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
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-account',
                hasOptedIn: false,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
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
    it('should not show error modal for Solana accounts', () => {
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
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-account',
                hasOptedIn: false,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
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

      // The test expects navigation to a modal for Solana accounts
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_ONBOARDING_1);
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
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-account',
                hasOptedIn: false,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
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
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: 'mocked_rewards.onboarding.not_supported_region_title',
          description:
            'mocked_rewards.onboarding.not_supported_region_description',
          confirmAction: {
            label: 'mocked_rewards.onboarding.not_supported_confirm',
            onPress: expect.any(Function),
            variant: 'Primary',
          },
        },
      );
    });
  });

  describe('candidateSubscriptionId states', () => {
    it('should show skeleton when candidateSubscriptionId is pending', () => {
      const mockSelectorWithPending = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: 'pending',
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-account',
                hasOptedIn: false,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorPending = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorPending.mockImplementation(mockSelectorWithPending);

      renderWithProviders(<OnboardingIntroStep />);

      // Should not render the main container when loading
      expect(screen.queryByTestId('onboarding-intro-container')).toBeNull();
    });

    it('should show error banner when candidateSubscriptionId is error', () => {
      const mockSelectorWithError = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: 'error',
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-account',
                hasOptedIn: false,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorError = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorError.mockImplementation(mockSelectorWithError);

      renderWithProviders(<OnboardingIntroStep />);

      // Should show error banner
      expect(
        screen.getByText('mocked_rewards.auth_fail_banner.title'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.auth_fail_banner.description'),
      ).toBeDefined();

      // Should show retry and cancel buttons
      expect(
        screen.getByText('mocked_rewards.auth_fail_banner.cta_retry'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.auth_fail_banner.cta_cancel'),
      ).toBeDefined();
    });

    it('should dispatch setCandidateSubscriptionId with retry when retry button is pressed', () => {
      const mockSelectorWithError = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: 'error',
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-account',
                hasOptedIn: false,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorError = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorError.mockImplementation(mockSelectorWithError);

      renderWithProviders(<OnboardingIntroStep />);

      const retryButton = screen.getByText(
        'mocked_rewards.auth_fail_banner.cta_retry',
      );
      fireEvent.press(retryButton);

      // Should dispatch setCandidateSubscriptionId with 'retry'
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setCandidateSubscriptionId'),
          payload: 'retry',
        }),
      );
    });

    it('should navigate to wallet view when cancel button is pressed', () => {
      const mockSelectorWithError = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: 'error',
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-account',
                hasOptedIn: false,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorError = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorError.mockImplementation(mockSelectorWithError);

      renderWithProviders(<OnboardingIntroStep />);

      const cancelButton = screen.getByText(
        'mocked_rewards.auth_fail_banner.cta_cancel',
      );
      fireEvent.press(cancelButton);

      // Should navigate to wallet view
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });
  });

  describe('auto-redirect functionality', () => {
    it('should navigate to rewards dashboard when user already has subscription', () => {
      const mockSelectorWithSubscription = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: 'test-subscription-id',
                account: 'test-account',
                hasOptedIn: true,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: 'test-subscription-id',
                  account: 'test-account',
                  hasOptedIn: true,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorWithSubscription = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorWithSubscription.mockImplementation(
        mockSelectorWithSubscription,
      );

      renderWithProviders(<OnboardingIntroStep />);

      // Should navigate to rewards dashboard
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    });
  });

  describe('geo error banner functionality', () => {
    it('should show geo error banner when geo rewards metadata fails to load', () => {
      const mockSelectorWithGeoError = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: false,
            optinAllowedForGeoLoading: false,
            optinAllowedForGeoError: true,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-account',
                hasOptedIn: false,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorWithGeoError = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorWithGeoError.mockImplementation(mockSelectorWithGeoError);

      renderWithProviders(<OnboardingIntroStep />);

      // Should show geo error banner
      expect(
        screen.getByText(
          'mocked_rewards.geo_rewards_metadata_error.error_fetching_title',
        ),
      ).toBeDefined();
      expect(
        screen.getByText(
          'mocked_rewards.geo_rewards_metadata_error.error_fetching_description',
        ),
      ).toBeDefined();
      expect(
        screen.getByText(
          'mocked_rewards.geo_rewards_metadata_error.retry_button',
        ),
      ).toBeDefined();
    });

    it('should call fetchGeoRewardsMetadata when retry button is pressed in geo error banner', () => {
      const mockFetchGeoRewardsMetadata = jest.fn();
      const mockUseGeoRewardsMetadata = jest.requireMock(
        '../../../hooks/useGeoRewardsMetadata',
      ).useGeoRewardsMetadata as jest.Mock;
      mockUseGeoRewardsMetadata.mockReturnValue({
        fetchGeoRewardsMetadata: mockFetchGeoRewardsMetadata,
      });

      const mockSelectorWithGeoError = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: false,
            optinAllowedForGeoLoading: false,
            optinAllowedForGeoError: true,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-account',
                hasOptedIn: false,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorWithGeoError = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorWithGeoError.mockImplementation(mockSelectorWithGeoError);

      renderWithProviders(<OnboardingIntroStep />);

      const retryButton = screen.getByText(
        'mocked_rewards.geo_rewards_metadata_error.retry_button',
      );
      fireEvent.press(retryButton);

      // Should call the fetch function
      expect(mockFetchGeoRewardsMetadata).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle missing account gracefully', () => {
      const mockSelectorWithNoAccount = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: null,
            },
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: null,
                  accounts: {},
                },
              },
              RewardsController: {
                activeAccount: null,
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

    it('should render skeleton when candidateSubscriptionId is pending and no subscription exists', () => {
      const mockSelectorWithSubscriptionId = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: 'existing-subscription',
                account: 'test-account',
                hasOptedIn: true,
              },
            },
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
              RewardsController: {
                activeAccount: {
                  subscriptionId: 'existing-subscription',
                  account: 'test-account',
                  hasOptedIn: true,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorWithSubscriptionId = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorWithSubscriptionId.mockImplementation(
        mockSelectorWithSubscriptionId,
      );

      renderWithProviders(<OnboardingIntroStep />);

      // Should render skeleton when subscription exists
      expect(screen.queryByTestId('onboarding-intro-container')).toBeNull();
    });
  });
});
