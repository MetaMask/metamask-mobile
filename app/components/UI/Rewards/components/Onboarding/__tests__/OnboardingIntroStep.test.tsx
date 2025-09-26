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

// Mock hardware account utils
jest.mock('../../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

// Mock useGeoRewardsMetadata hook
jest.mock('../../../hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: jest.fn(() => ({
    fetchGeoRewardsMetadata: jest.fn(),
  })),
}));

// Tailwind mock is handled in test-utils.ts

// Mock Engine controllerMessenger
const mockControllerMessengerCall = jest.fn();
jest.mock('../../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: mockControllerMessengerCall,
  },
}));

// Mock strings
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => `mocked_${key}`,
}));

describe('OnboardingIntroStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset hardware account mock to default (false)
    const mockIsHardwareAccount = jest.requireMock(
      '../../../../../../util/address',
    ).isHardwareAccount as jest.Mock;
    mockIsHardwareAccount.mockReturnValue(false);

    // Reset controller messenger mock to default (returns true for isOptInSupported)
    mockControllerMessengerCall.mockReturnValue(true);
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

      // Ensure hardware account check returns false so geo check is reached
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

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
            label: 'mocked_rewards.onboarding.not_supported_confirm_go_back',
            onPress: expect.any(Function),
            variant: 'Primary',
          },
        },
      );
    });

    it('should show error modal when account is hardware wallet', () => {
      // Mock hardware account check to return true
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(true);

      const mockSelectorWithHardwareAccount = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true, // Geo is allowed, so hardware check is reached
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-hardware-account',
                hasOptedIn: false,
              },
            },
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-hardware-account',
                  accounts: {
                    'test-hardware-account': {
                      type: 'eip155:eoa',
                      address: '0x123',
                    },
                  },
                },
              },
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-hardware-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorHardware = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorHardware.mockImplementation(
        mockSelectorWithHardwareAccount,
      );

      renderWithProviders(<OnboardingIntroStep />);

      const confirmButton = screen.getByText(
        'mocked_rewards.onboarding.intro_confirm',
      );
      fireEvent.press(confirmButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title:
            'mocked_rewards.onboarding.not_supported_hardware_account_title',
          description:
            'mocked_rewards.onboarding.not_supported_hardware_account_description',
          confirmAction: {
            label: 'mocked_rewards.onboarding.not_supported_confirm_go_back',
            onPress: expect.any(Function),
            variant: 'Primary',
          },
        },
      );
    });

    it('should proceed to onboarding when account is not a hardware wallet', () => {
      // Mock hardware account check to return false
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      const mockSelectorWithRegularAccount = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-regular-account',
                hasOptedIn: false,
              },
            },
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-regular-account',
                  accounts: {
                    'test-regular-account': {
                      type: 'eip155:eoa',
                      address: '0x456',
                    },
                  },
                },
              },
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-regular-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorRegular = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorRegular.mockImplementation(mockSelectorWithRegularAccount);

      renderWithProviders(<OnboardingIntroStep />);

      const confirmButton = screen.getByText(
        'mocked_rewards.onboarding.intro_confirm',
      );
      fireEvent.press(confirmButton);

      // Should proceed to next onboarding step
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_ONBOARDING_1);
    });

    it('should show error modal when account type is not supported for opt-in', () => {
      // Mock isOptInSupported to return false
      mockControllerMessengerCall.mockReturnValue(false);

      // Mock hardware account check to return false so we reach the isOptInSupported check
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      const mockSelectorWithUnsupportedAccount = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true, // Geo is allowed, so account type check is reached
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-unsupported-account',
                hasOptedIn: false,
              },
            },
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-unsupported-account',
                  accounts: {
                    'test-unsupported-account': {
                      type: 'unsupported:type',
                      address: '0x789',
                    },
                  },
                },
              },
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-unsupported-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorUnsupported = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorUnsupported.mockImplementation(
        mockSelectorWithUnsupportedAccount,
      );

      renderWithProviders(<OnboardingIntroStep />);

      const confirmButton = screen.getByText(
        'mocked_rewards.onboarding.intro_confirm',
      );
      fireEvent.press(confirmButton);

      // Should call isOptInSupported with the internal account
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        {
          type: 'unsupported:type',
          address: '0x789',
        },
      );

      // Should show error modal for unsupported account type
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: 'mocked_rewards.onboarding.not_supported_account_type_title',
          description:
            'mocked_rewards.onboarding.not_supported_account_type_description',
          confirmAction: {
            label: 'mocked_rewards.onboarding.not_supported_confirm_go_back',
            onPress: expect.any(Function),
            variant: 'Primary',
          },
        },
      );
    });

    it('should proceed to onboarding when account type is supported for opt-in', () => {
      // Mock isOptInSupported to return true
      mockControllerMessengerCall.mockReturnValue(true);

      // Mock hardware account check to return false so we reach the isOptInSupported check
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      const mockSelectorWithSupportedAccount = jest.fn((selector) => {
        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null,
                account: 'test-supported-account',
                hasOptedIn: false,
              },
            },
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-supported-account',
                  accounts: {
                    'test-supported-account': {
                      type: 'eip155:eoa',
                      address: '0x999',
                    },
                  },
                },
              },
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-supported-account',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      const mockUseSelectorSupported = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorSupported.mockImplementation(
        mockSelectorWithSupportedAccount,
      );

      renderWithProviders(<OnboardingIntroStep />);

      const confirmButton = screen.getByText(
        'mocked_rewards.onboarding.intro_confirm',
      );
      fireEvent.press(confirmButton);

      // Should call isOptInSupported with the internal account
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        {
          type: 'eip155:eoa',
          address: '0x999',
        },
      );

      // Should proceed to next onboarding step
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_ONBOARDING_1);
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

    it('should show error modal when candidateSubscriptionId is error', () => {
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

      // Should show error modal via navigation
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: 'mocked_rewards.onboarding.auth_fail_title',
          description: 'mocked_rewards.onboarding.auth_fail_description',
          confirmAction: {
            label: 'mocked_rewards.onboarding.not_supported_confirm_retry',
            onPress: expect.any(Function),
            variant: 'Primary',
          },
          onCancel: expect.any(Function),
          cancelLabel:
            'mocked_rewards.onboarding.not_supported_confirm_go_back',
        },
      );
    });

    it('should dispatch setCandidateSubscriptionId with retry when modal retry is triggered', () => {
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

      // Should have called navigation with retry function
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          confirmAction: expect.objectContaining({
            onPress: expect.any(Function),
          }),
        }),
      );

      // Get the retry function from the mock call and execute it
      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const retryFunction = navCall[1].confirmAction.onPress;
      retryFunction();

      // Should dispatch setCandidateSubscriptionId with 'retry'
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setCandidateSubscriptionId'),
          payload: 'retry',
        }),
      );
    });

    it('should navigate back when modal cancel is triggered', () => {
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

      // Should have called navigation with cancel function
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          onCancel: expect.any(Function),
        }),
      );

      // Get the cancel function from the mock call and execute it
      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const cancelFunction = navCall[1].onCancel;
      cancelFunction();

      // Should navigate back
      expect(mockGoBack).toHaveBeenCalledTimes(1);
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
