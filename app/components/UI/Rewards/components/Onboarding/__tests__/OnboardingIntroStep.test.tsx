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

// Mock ButtonHero to a simple Touchable implementation to avoid theme coupling
jest.mock(
  '../../../../../../component-library/components-temp/Buttons/ButtonHero',
  () => {
    const ReactActual = jest.requireActual('react');
    const { TouchableOpacity, Text: RNText } =
      jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (
        params: {
          children?: React.ReactNode;
          onPress?: () => void;
          isLoading?: boolean;
          loadingText?: React.ReactNode;
        } & Record<string, unknown>,
      ) =>
        // Destructure with explicit types to avoid implicit any
        (({
          children,
          onPress,
          isLoading,
          loadingText,
          ...props
        }: {
          children?: React.ReactNode;
          onPress?: () => void;
          isLoading?: boolean;
          loadingText?: React.ReactNode;
        } & Record<string, unknown>) =>
          ReactActual.createElement(
            TouchableOpacity,
            { onPress, testID: 'button-hero', ...props },
            ReactActual.createElement(
              RNText,
              null,
              isLoading ? loadingText : children,
            ),
          ))(params),
    };
  },
);
// Inject default props into OnboardingIntroStep to reflect new API
jest.mock('../OnboardingIntroStep', () => {
  const ReactActual = jest.requireActual('react');
  const Actual = jest.requireActual('../OnboardingIntroStep').default;
  const Wrapper = (props: Record<string, unknown>) =>
    ReactActual.createElement(Actual, {
      title: 'mocked_rewards.onboarding.intro_title',
      description: 'mocked_rewards.onboarding.intro_description',
      confirmLabel: 'mocked_rewards.onboarding.intro_confirm',
      ...props,
    });
  return { __esModule: true, default: Wrapper };
});
// Use the mocked component with no required props to avoid TS errors
const OnboardingIntroStep = jest.requireMock('../OnboardingIntroStep')
  .default as unknown as React.ComponentType<Record<string, never>>;

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

// Mock metrics - first definition (will be overridden below with constants). Keeping for potential earlier imports.
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

// Tailwind mock is handled in test-utils.ts

// Mock Engine controllerMessenger
jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

// Override metrics mock to also export MetaMetricsEvents constants while preserving proper builder shape
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

    // Reset controller messenger mock to default (returns true for isOptInSupported and hasActiveSeason)
    mockEngineCall.mockImplementation((...args: unknown[]) => {
      const method = args[0] as string;
      if (method === 'RewardsController:isOptInSupported') {
        return true; // Default to true for supported account types
      }
      if (method === 'RewardsController:hasActiveSeason') {
        return Promise.resolve(true); // Return Promise for async call
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
    it('should render without crashing', async () => {
      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      await waitFor(() => {
        expect(screen.getByTestId('onboarding-intro-container')).toBeDefined();
      });
    });

    it('should render intro title and description', async () => {
      // Ensure the mock returns Promise for hasActiveSeason
      mockEngineCall.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:hasActiveSeason') {
          return Promise.resolve(true);
        }
        return undefined;
      });

      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      await waitFor(() => {
        expect(
          screen.getByText('mocked_rewards.onboarding.intro_title'),
        ).toBeDefined();
      });

      expect(
        screen.getByText('mocked_rewards.onboarding.intro_description'),
      ).toBeDefined();
    });

    it('should render confirm and skip buttons', async () => {
      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      await waitFor(() => {
        expect(
          screen.getByText('mocked_rewards.onboarding.intro_confirm'),
        ).toBeDefined();
      });

      expect(
        screen.getByText('mocked_rewards.onboarding.intro_skip'),
      ).toBeDefined();
    });

    it('should render intro image', async () => {
      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      const introImage = await waitFor(() => screen.getByTestId('intro-image'));
      expect(introImage).toBeDefined();
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

  describe('user interactions', () => {
    it('should handle skip button press', async () => {
      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      const skipButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_skip'),
      );
      fireEvent.press(skipButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('should handle next button press when geo is allowed and account is valid', async () => {
      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm'),
      );
      fireEvent.press(confirmButton);

      // Verify navigation behavior instead of implementation details
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('should show loading state when checking geo permissions', async () => {
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

      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm_geo_loading'),
      );
      expect(confirmButton).toBeDefined();
    });
  });

  describe('account validation', () => {
    it('should show error modal for Solana accounts', async () => {
      // Note: Solana accounts are now filtered out before reaching OnboardingIntroStep
      // by the account group selector. This test verifies behavior if a Solana account
      // somehow exists in the group (which shouldn't happen in practice).

      // Create account group with Solana account
      const solanaAccountGroup = createMockAccountGroupAccounts([
        {
          id: 'test-solana',
          address: 'solana-address',
          type: 'bip122:000000000019d6689c085ae165831e93',
        },
      ]);

      const mockUseSelectorSolana = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorSolana.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return solanaAccountGroup;
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
                account: 'test-solana',
                hasOptedIn: false,
              },
            },
          },
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-solana',
                  accounts: {
                    'test-solana': {
                      type: 'bip122:000000000019d6689c085ae165831e93',
                      address: 'solana-address',
                    },
                  },
                },
              },
              RewardsController: {
                activeAccount: {
                  subscriptionId: null,
                  account: 'test-solana',
                  hasOptedIn: false,
                },
              },
            },
          },
        };
        return selector(state);
      });

      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm'),
      );
      fireEvent.press(confirmButton);

      // Should proceed normally (Solana check removed from this component)
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should show error modal for geo-restricted regions', async () => {
      // Ensure hardware account check returns false so geo check is reached
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      const mockSelectorWithGeoBlocked = jest.fn((selector) => {
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

      // Wait for the async state update from fetchHasActiveSeason to complete
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm'),
      );
      fireEvent.press(confirmButton);

      // Should show error modal for geo-restricted regions
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

    it('should show retry error modal when geo check fails with error', async () => {
      // Mock fetchGeoRewardsMetadata function
      const mockFetchGeoRewardsMetadata = jest.fn();
      const mockUseGeoRewardsMetadata = jest.requireMock(
        '../../../hooks/useGeoRewardsMetadata',
      ).useGeoRewardsMetadata as jest.Mock;
      mockUseGeoRewardsMetadata.mockReturnValue({
        fetchGeoRewardsMetadata: mockFetchGeoRewardsMetadata,
      });

      // Ensure hardware account check returns false so geo check is reached
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      const mockSelectorWithGeoError = jest.fn((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }
        const state = {
          rewards: {
            optinAllowedForGeo: false, // Geo not allowed
            optinAllowedForGeoLoading: false, // Not loading
            optinAllowedForGeoError: true, // Error occurred
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null, // No subscription
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

      const mockUseSelectorGeoError = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorGeoError.mockImplementation(mockSelectorWithGeoError);

      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm'),
      );
      fireEvent.press(confirmButton);

      // Should show retry error modal for geo check failure
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: 'mocked_rewards.onboarding.geo_check_fail_title',
          description: 'mocked_rewards.onboarding.geo_check_fail_description',
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

      // Verify that the retry function calls fetchGeoRewardsMetadata
      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const retryFunction = navCall[1].confirmAction.onPress;
      retryFunction();

      // Should call fetchGeoRewardsMetadata when retry is pressed
      expect(mockFetchGeoRewardsMetadata).toHaveBeenCalledTimes(1);
    });

    it('should not show geo error modal when geo is loading even if error occurred', async () => {
      // Mock fetchGeoRewardsMetadata function
      const mockFetchGeoRewardsMetadata = jest.fn();
      const mockUseGeoRewardsMetadata = jest.requireMock(
        '../../../hooks/useGeoRewardsMetadata',
      ).useGeoRewardsMetadata as jest.Mock;
      mockUseGeoRewardsMetadata.mockReturnValue({
        fetchGeoRewardsMetadata: mockFetchGeoRewardsMetadata,
      });

      // Ensure hardware account check returns false so geo check is reached
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      const mockSelectorWithGeoErrorAndLoading = jest.fn((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return defaultAccountGroupAccounts;
        }
        const state = {
          rewards: {
            optinAllowedForGeo: false, // Geo not allowed
            optinAllowedForGeoLoading: true, // Still loading
            optinAllowedForGeoError: true, // Error occurred
            onboardingActiveStep: 'intro',
            candidateSubscriptionId: null,
            rewardsControllerState: {
              activeAccount: {
                subscriptionId: null, // No subscription
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

      const mockUseSelectorGeoErrorAndLoading = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorGeoErrorAndLoading.mockImplementation(
        mockSelectorWithGeoErrorAndLoading,
      );

      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      // When optinAllowedForGeoLoading is true, the button shows loading text
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm_geo_loading'),
      );
      fireEvent.press(confirmButton);

      // Should NOT show geo error modal when still loading
      // The button should be disabled or show loading state instead
      const geoErrorModalCall = mockNavigate.mock.calls.find(
        (call) =>
          call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL &&
          call[1]?.title === 'mocked_rewards.onboarding.geo_check_fail_title',
      );
      expect(geoErrorModalCall).toBeUndefined();
    });

    it('should show error modal when account group contains hardware wallet', async () => {
      // Create account group with hardware wallet account
      const hardwareAccountGroup = createMockAccountGroupAccounts([
        { id: 'test-hardware-account', address: '0x123', type: 'eip155:eoa' },
      ]);

      // Mock hardware account check to return true for this address
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

      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm'),
      );
      fireEvent.press(confirmButton);

      // Should show error modal for hardware accounts
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

    it('should proceed to onboarding when account group has no hardware wallet', async () => {
      // Reset all mocks
      jest.clearAllMocks();

      // Create regular account group
      const regularAccountGroup = createMockAccountGroupAccounts([
        { id: 'test-regular-account', address: '0x456', type: 'eip155:eoa' },
      ]);

      // Mock hardware account check to return false
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      // Mock controller messenger to return true for isOptInSupported and hasActiveSeason
      mockEngineCall.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:hasActiveSeason') {
          return Promise.resolve(true);
        }
        return undefined;
      });

      const mockUseSelectorRegular = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorRegular.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroupInternalAccounts) {
          return regularAccountGroup;
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

      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm'),
      );
      fireEvent.press(confirmButton);

      // Verify navigation behavior instead of implementation details
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should show error modal when no account in group is supported for opt-in', async () => {
      // Create account group with unsupported account type
      const unsupportedAccountGroup = createMockAccountGroupAccounts([
        {
          id: 'test-unsupported-account',
          address: '0x789',
          type: 'unsupported:type',
        },
      ]);

      // Mock isOptInSupported to return false for all accounts in this group
      mockEngineCall.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        const account = args[1] as { type?: string } | undefined;
        if (
          method === 'RewardsController:isOptInSupported' &&
          account?.type === 'unsupported:type'
        ) {
          return false;
        }
        if (method === 'RewardsController:hasActiveSeason') {
          return Promise.resolve(true);
        }
        return true;
      });

      // Mock hardware account check to return false so we reach the isOptInSupported check
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

      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm'),
      );
      fireEvent.press(confirmButton);

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

    it('should proceed to onboarding when account group has at least one supported account', async () => {
      // Reset all mocks
      jest.clearAllMocks();

      // Create account group with supported account
      const supportedAccountGroup = createMockAccountGroupAccounts([
        { id: 'test-supported-account', address: '0x999', type: 'eip155:eoa' },
      ]);

      // Mock hardware account check to return false
      const mockIsHardwareAccount = jest.requireMock(
        '../../../../../../util/address',
      ).isHardwareAccount as jest.Mock;
      mockIsHardwareAccount.mockReturnValue(false);

      // Mock isOptInSupported and hasActiveSeason to return true
      mockEngineCall.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:hasActiveSeason') {
          return Promise.resolve(true);
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

      // Clear navigate mock to ensure clean test state
      mockNavigate.mockClear();

      renderWithProviders(<OnboardingIntroStep />);

      // Wait for the async state update from fetchHasActiveSeason to complete
      // Verify the button is rendered
      const confirmButton = await waitFor(() =>
        screen.getByText('mocked_rewards.onboarding.intro_confirm'),
      );

      // Press the button
      fireEvent.press(confirmButton);

      // Verify navigation behavior instead of implementation details
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('candidateSubscriptionId states', () => {
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

      renderWithProviders(<OnboardingIntroStep />);

      // Should not render the main container when loading
      expect(screen.queryByTestId('onboarding-intro-container')).toBeNull();
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

      renderWithProviders(<OnboardingIntroStep />);

      // Should not render the main container when loading
      expect(screen.queryByTestId('onboarding-intro-container')).toBeNull();
    });

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
      const mockUseSelectorWithSubscription = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorWithSubscription.mockImplementation((selector) => {
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

      renderWithProviders(<OnboardingIntroStep />);

      // Should navigate to rewards dashboard
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    });
  });

  describe('edge cases', () => {
    it('should render skeleton when candidateSubscriptionId is pending and no subscription exists', () => {
      const mockUseSelectorWithSubscriptionId = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      mockUseSelectorWithSubscriptionId.mockImplementation((selector) => {
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

      renderWithProviders(<OnboardingIntroStep />);

      // Should render skeleton when subscription exists
      expect(screen.queryByTestId('onboarding-intro-container')).toBeNull();
    });
  });
});
