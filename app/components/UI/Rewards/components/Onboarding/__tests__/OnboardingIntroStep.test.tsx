import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders, createMockDispatch } from '../testUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { REWARDS_GTM_MODAL_SHOWN } from '../../../../../../constants/storage';
import Engine from '../../../../../../core/Engine';

// Mock tailwind preset to provide ThemeProvider and Theme.Light used by ButtonHero
jest.mock('@metamask/design-system-twrnc-preset', () => {
  const ReactActual = jest.requireActual('react');
  return {
    useTailwind: () => ({
      // Return a minimal style function used in components
      style: (..._args: unknown[]) => ({}) as Record<string, unknown>,
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    Theme: { Light: 'Light' },
  };
});

// Mock OnboardingNoActiveSeasonStep so we can inspect the canContinue prop
jest.mock('../OnboardingNoActiveSeasonStep', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity, Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      canContinue,
      geoLoading,
    }: {
      canContinue: () => boolean;
      geoLoading?: boolean;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          testID: 'no-active-season-step',
          onPress: canContinue,
          accessibilityLabel: geoLoading ? 'geo-loading' : 'ready',
        },
        ReactActual.createElement(RNText, null, 'NoActiveSeasonStep'),
      ),
  };
});

// Import component under test after all mocks are set up
import OnboardingIntroStep from '../OnboardingIntroStep';

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

// Helper to create mock account group accounts
const createMockAccountGroupAccounts = (
  overrides: Partial<{
    id: string;
    address: string;
    type: string;
    options: Record<string, unknown>;
    methods: string[];
    metadata: { name: string; keyring: { type: string } };
  }>[],
) =>
  overrides.map((override) => ({
    id: 'test-account',
    address: '0x123',
    type: 'eip155:eoa',
    options: {},
    methods: [],
    metadata: {
      name: 'Test Account',
      keyring: { type: 'HD Key Tree' },
    },
    ...override,
  }));

// Default mock account group accounts
const defaultAccountGroupAccounts = createMockAccountGroupAccounts([
  { id: 'test-account', address: '0x123', type: 'eip155:eoa' },
]);

// Import the actual selectors to identify them in mocks
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../../selectors/multichainAccounts/accountTreeController';
import storageWrapper from '../../../../../../store/storage-wrapper';

// Mock redux
const mockDispatch = createMockDispatch();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

// Mock metrics
jest.mock('../../../../../../components/hooks/useMetrics', () => {
  const mockBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  };
  return {
    useMetrics: () => ({
      trackEvent: jest.fn(),
      createEventBuilder: jest.fn(() => mockBuilder),
    }),
    MetaMetricsEvents: {
      REWARDS_ONBOARDING_STARTED: 'REWARDS_ONBOARDING_STARTED',
      REWARDS_ONBOARDING_COMPLETED: 'REWARDS_ONBOARDING_COMPLETED',
    },
  };
});

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

// Mock Engine controllerMessenger
jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

// Mock strings
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => `mocked_${key}`,
}));

// Mock storage wrapper
jest.mock('../../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('OnboardingIntroStep', () => {
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset storage mock to default (resolved promise)
    (storageWrapper.setItem as jest.Mock).mockResolvedValue(undefined);

    // Reset hardware account mock to default (false)
    const mockIsHardwareAccount = jest.requireMock(
      '../../../../../../util/address',
    ).isHardwareAccount as jest.Mock;
    mockIsHardwareAccount.mockReturnValue(false);

    // Reset controller messenger mock to default (returns true for isOptInSupported)
    mockEngineCall.mockImplementation((...args: unknown[]) => {
      const method = args[0] as string;
      if (method === 'RewardsController:isOptInSupported') {
        return true;
      }
      return undefined;
    });

    // Set up default useSelector mock
    const mockUseSelector = jest.requireMock('react-redux')
      .useSelector as jest.Mock;
    mockUseSelector.mockImplementation((selector) => {
      // Check if this is the accountGroupAccounts selector
      if (selector === selectSelectedAccountGroupInternalAccounts) {
        return defaultAccountGroupAccounts;
      }

      // Otherwise, use the normal state-based selectors
      const state = {
        rewards: {
          optinAllowedForGeo: true,
          optinAllowedForGeoLoading: false,
          optinAllowedForGeoError: false,
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
  });

  describe('rendering', () => {
    it('should render without crashing and show the no-season step', () => {
      renderWithProviders(<OnboardingIntroStep />);

      expect(screen.getByTestId('no-active-season-step')).toBeDefined();
    });

    it('should pass geoLoading=false when geo check is not loading', () => {
      renderWithProviders(<OnboardingIntroStep />);

      const step = screen.getByTestId('no-active-season-step');
      expect(step.props.accessibilityLabel).toBe('ready');
    });

    it('should pass geoLoading=true when geo check is loading', () => {
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }

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
                  accounts: { 'test-account': { type: 'eip155:eoa' } },
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

      const step = screen.getByTestId('no-active-season-step');
      expect(step.props.accessibilityLabel).toBe('geo-loading');
    });
  });

  describe('storage behavior', () => {
    it('should set REWARDS_GTM_MODAL_SHOWN flag in storage when component mounts', async () => {
      // Arrange - storageWrapper.setItem is already configured in beforeEach

      // Act
      renderWithProviders(<OnboardingIntroStep />);

      // Assert
      // Wait for the async storage operation to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(storageWrapper.setItem).toHaveBeenCalledWith(
        REWARDS_GTM_MODAL_SHOWN,
        'true',
      );
      expect(storageWrapper.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading states', () => {
    it('should show skeleton when candidateSubscriptionId is pending', () => {
      const mockUseSelectorPending = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorPending.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }

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
                  accounts: { 'test-account': { type: 'eip155:eoa' } },
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

      // Should not render the no-season step when loading
      expect(screen.queryByTestId('no-active-season-step')).toBeNull();
    });

    it('should show skeleton when candidateSubscriptionId is retry', () => {
      const mockUseSelectorRetry = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorRetry.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }

        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: 'retry',
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
                  accounts: { 'test-account': { type: 'eip155:eoa' } },
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

      // Should not render the no-season step when loading
      expect(screen.queryByTestId('no-active-season-step')).toBeNull();
    });
  });

  describe('candidateSubscriptionId error state', () => {
    it('should show error modal when candidateSubscriptionId is error', () => {
      const mockUseSelectorError = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorError.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }

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
                  accounts: { 'test-account': { type: 'eip155:eoa' } },
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

      // Should show error modal via navigation
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: 'mocked_rewards.onboarding.auth_fail_title',
          description: 'mocked_rewards.onboarding.auth_fail_description',
          confirmAction: {
            label: 'mocked_rewards.onboarding.not_supported_confirm_retry',
            onPress: expect.any(Function),
            variant: 'primary',
          },
          onCancel: expect.any(Function),
          cancelLabel:
            'mocked_rewards.onboarding.not_supported_confirm_go_back',
        },
      );
    });

    it('should dispatch setCandidateSubscriptionId with retry when modal retry is triggered', () => {
      const mockUseSelectorError = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorError.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }

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
                  accounts: { 'test-account': { type: 'eip155:eoa' } },
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

      // Find the modal call and trigger the retry
      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      expect(navCall).toBeDefined();
      const retryFunction = navCall[1].confirmAction.onPress;
      retryFunction();

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('account validation (canContinue)', () => {
    it('should proceed when geo is allowed and account is valid', () => {
      renderWithProviders(<OnboardingIntroStep />);

      const step = screen.getByTestId('no-active-season-step');
      fireEvent.press(step);

      // canContinue returned true — no error modal was shown
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.anything(),
      );
    });

    it('should show error modal for geo-restricted regions', () => {
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      const mockUseSelectorGeoBlocked = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorGeoBlocked.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }
        const state = {
          rewards: {
            optinAllowedForGeo: false,
            optinAllowedForGeoLoading: false,
            optinAllowedForGeoError: false,
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
                  accounts: { 'test-account': { type: 'eip155:eoa' } },
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

      const step = screen.getByTestId('no-active-season-step');
      fireEvent.press(step);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: 'mocked_rewards.onboarding.not_supported_region_title',
          description:
            'mocked_rewards.onboarding.not_supported_region_description',
          confirmAction: {
            label: 'mocked_rewards.onboarding.not_supported_confirm_go_back',
            onPress: expect.any(Function),
            variant: 'primary',
          },
        },
      );
    });

    it('should show retry error modal when geo check fails with error', () => {
      const mockFetchGeoRewardsMetadata = jest.fn();
      const mockUseGeoRewardsMetadata = jest.requireMock(
        '../../../hooks/useGeoRewardsMetadata',
      ).useGeoRewardsMetadata as jest.Mock;
      mockUseGeoRewardsMetadata.mockReturnValue({
        fetchGeoRewardsMetadata: mockFetchGeoRewardsMetadata,
      });

      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      const mockUseSelectorGeoError = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorGeoError.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }
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
                  accounts: { 'test-account': { type: 'eip155:eoa' } },
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

      const step = screen.getByTestId('no-active-season-step');
      fireEvent.press(step);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: 'mocked_rewards.onboarding.geo_check_fail_title',
          description: 'mocked_rewards.onboarding.geo_check_fail_description',
          confirmAction: {
            label: 'mocked_rewards.onboarding.not_supported_confirm_retry',
            onPress: expect.any(Function),
            variant: 'primary',
          },
          onCancel: expect.any(Function),
          cancelLabel:
            'mocked_rewards.onboarding.not_supported_confirm_go_back',
        },
      );

      // Verify that the retry function calls fetchGeoRewardsMetadata
      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const retryFunction = navCall[1].confirmAction.onPress;
      retryFunction();

      expect(mockFetchGeoRewardsMetadata).toHaveBeenCalledTimes(1);
    });

    it('should show error modal when account group contains hardware wallet', () => {
      const hardwareAccountGroup = createMockAccountGroupAccounts([
        { id: 'test-hardware-account', address: '0x123', type: 'eip155:eoa' },
      ]);

      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(true);

      const mockUseSelectorHardware = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorHardware.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return hardwareAccountGroup;
        }

        const state = {
          rewards: {
            optinAllowedForGeo: true,
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

      renderWithProviders(<OnboardingIntroStep />);

      const step = screen.getByTestId('no-active-season-step');
      fireEvent.press(step);

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
            variant: 'primary',
          },
        },
      );
    });

    it('should show error modal when no account in group is supported for opt-in', () => {
      const unsupportedAccountGroup = createMockAccountGroupAccounts([
        {
          id: 'test-unsupported-account',
          address: '0x789',
          type: 'unsupported:type',
        },
      ]);

      mockEngineCall.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        const account = args[1] as { type?: string } | undefined;
        if (
          method === 'RewardsController:isOptInSupported' &&
          account?.type === 'unsupported:type'
        ) {
          return false;
        }
        return true;
      });

      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      const mockUseSelectorUnsupported = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorUnsupported.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return unsupportedAccountGroup;
        }

        const state = {
          rewards: {
            optinAllowedForGeo: true,
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

      renderWithProviders(<OnboardingIntroStep />);

      const step = screen.getByTestId('no-active-season-step');
      fireEvent.press(step);

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: 'mocked_rewards.onboarding.not_supported_account_type_title',
          description:
            'mocked_rewards.onboarding.not_supported_account_type_description',
          confirmAction: {
            label: 'mocked_rewards.onboarding.not_supported_confirm_go_back',
            onPress: expect.any(Function),
            variant: 'primary',
          },
        },
      );
    });

    it('should proceed when account group has at least one supported account', () => {
      jest.clearAllMocks();

      const supportedAccountGroup = createMockAccountGroupAccounts([
        { id: 'test-supported-account', address: '0x999', type: 'eip155:eoa' },
      ]);

      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      mockEngineCall.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        return undefined;
      });

      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return supportedAccountGroup;
        }

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

      // Reset storage mock after clearAllMocks
      (storageWrapper.setItem as jest.Mock).mockResolvedValue(undefined);

      renderWithProviders(<OnboardingIntroStep />);

      const step = screen.getByTestId('no-active-season-step');
      fireEvent.press(step);

      // canContinue returned true — no error modal
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.anything(),
      );
    });
  });

  describe('navigation', () => {
    it('should navigate to dashboard when already subscribed', () => {
      const mockUseSelector = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }

        const state = {
          rewards: {
            optinAllowedForGeo: true,
            optinAllowedForGeoLoading: false,
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: 'existing-subscription-id',
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
                  accounts: { 'test-account': { type: 'eip155:eoa' } },
                },
              },
              RewardsController: {
                activeAccount: {
                  subscriptionId: 'existing-subscription-id',
                  account: 'test-account',
                  hasOptedIn: true,
                },
              },
            },
          },
        };
        return selector(state);
      });

      renderWithProviders(<OnboardingIntroStep />);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    });
  });
});
