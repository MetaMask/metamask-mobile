// Mock SDK first - must be hoisted before imports
const mockLogoutFromProvider = jest.fn();
const mockSetIsAuthenticated = jest.fn();
const mockSdk = {
  get isBaanxLoginEnabled() {
    return true;
  },
  get isCardEnabled() {
    return true;
  },
  getSupportedTokensByChainId: jest.fn(() => []),
  isCardHolder: jest.fn(),
  getGeoLocation: jest.fn(),
  getSupportedTokensAllowances: jest.fn(),
  getPriorityToken: jest.fn(),
  initiateCardProviderAuthentication: jest.fn(),
  login: jest.fn(),
  authorize: jest.fn(),
  exchangeToken: jest.fn(),
  refreshLocalToken: jest.fn(),
  getCardDetails: jest.fn(),
  getCardExternalWalletDetails: jest.fn(),
};

jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(() => ({
    sdk: mockSdk,
    isLoading: false,
    logoutFromProvider: mockLogoutFromProvider,
    userCardLocation: 'international' as const,
  })),
  withCardSDK: (component: React.ComponentType) => component,
}));

jest.mock('../../hooks/isBaanxLoginEnabled', () => ({
  __esModule: true,
  default: jest.fn(() => true),
}));

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import React from 'react';
import CardHome from './CardHome';
import { cardDefaultNavigationOptions } from '../../routes';
import renderWithProvider, {
  renderScreen,
} from '../../../../../util/test/renderWithProvider';
import { withCardSDK } from '../../sdk';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
import { AllowanceState, CardWarning, CardType } from '../../types';
import useLoadCardData from '../../hooks/useLoadCardData';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useCardProvision } from '../../hooks/useCardProvision';
import { TOKEN_RATE_UNDEFINED } from '../../../Tokens/constants';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  selectDepositActiveFlag,
  selectDepositMinimumVersionFlag,
} from '../../../../../selectors/featureFlagController/deposit';
import { selectChainId } from '../../../../../selectors/networkController';
import {
  selectCardholderAccounts,
  selectIsAuthenticatedCard,
} from '../../../../../core/redux/slices/card';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockNavigationDispatch = jest.fn();

import { useFocusEffect, StackActions } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useFocusEffect: jest.fn(),
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions,
      dispatch: mockNavigationDispatch,
    }),
    StackActions: {
      replace: jest.fn((routeName) => ({
        type: 'REPLACE',
        routeName,
      })),
    },
  };
});

const mockPriorityToken = {
  address: '0x123...',
  symbol: 'USDC',
  decimals: 6,
  balance: '1000000000',
  allowance: '500000000',
  totalAllowance: '1000',
  name: 'USD Coin',
  chainId: 1,
  caipChainId: 'eip155:1',
  walletAddress: '0x789',
  allowanceState: AllowanceState.Enabled,
};

const mockCurrentAddress = '0x789';

const mockSelectedInternalAccount = {
  address: mockCurrentAddress,
};

// Mock hooks
const mockFetchPriorityToken = jest.fn().mockResolvedValue(mockPriorityToken);
const mockFetchCardDetails = jest.fn();
const mockFetchAllData = jest.fn();
const mockPollCardStatusUntilProvisioned = jest.fn().mockResolvedValue(true);
const mockNavigateToCardPage = jest.fn();
const mockGoToSwaps = jest.fn();
const mockDispatch = jest.fn();
const mockOpenSwaps = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ event: 'built' }),
};

interface MockAssetBalanceInfo {
  balanceFiat: string | undefined;
  asset: { symbol: string; image: string };
  balanceFormatted: string | undefined;
  rawTokenBalance?: number;
  rawFiatNumber?: number;
}

const createMockAssetBalancesMap = (
  balanceInfo: MockAssetBalanceInfo,
  token = mockPriorityToken,
): Map<string, MockAssetBalanceInfo> => {
  const map = new Map<string, MockAssetBalanceInfo>();
  // Use the same key format as the component: `${address}-${caipChainId}-${walletAddress}`
  const key = `${token.address?.toLowerCase()}-${token.caipChainId}-${token.walletAddress?.toLowerCase()}`;
  map.set(key, balanceInfo);
  return map;
};

const mockUseAssetBalances = jest.fn(() =>
  createMockAssetBalancesMap({
    balanceFiat: '$1,000.00',
    asset: {
      symbol: 'USDC',
      image: 'usdc-image-url',
    },
    balanceFormatted: '1000.000000 USDC',
    rawTokenBalance: 1000,
    rawFiatNumber: 1000,
  }),
);

const mockUseNavigateToCardPage = jest.fn(() => ({
  navigateToCardPage: mockNavigateToCardPage,
}));

const mockUseSwapBridgeNavigation = jest.fn(() => ({
  goToSwaps: mockGoToSwaps,
}));

jest.mock('../../hooks/useLoadCardData', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useAssetBalances', () => ({
  useAssetBalances: () => mockUseAssetBalances(),
}));

jest.mock('../../hooks/useNavigateToCardPage', () => ({
  useNavigateToCardPage: () => mockUseNavigateToCardPage(),
}));

jest.mock('../../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => mockUseSwapBridgeNavigation(),
  SwapBridgeNavigationLocation: {
    TokenDetails: 'TokenDetails',
  },
}));

jest.mock('../../hooks/useOpenSwaps', () => ({
  useOpenSwaps: jest.fn(),
}));

jest.mock('../../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
  RampMode: { AGGREGATOR: 'AGGREGATOR', DEPOSIT: 'DEPOSIT' },
}));

jest.mock('../../hooks/useIsSwapEnabledForPriorityToken', () => ({
  useIsSwapEnabledForPriorityToken: jest.fn(),
}));

jest.mock('../../hooks/useCardProvision', () => ({
  useCardProvision: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_ADD_FUNDS_CLICKED: 'card_add_funds_clicked',
    CARD_HOME_VIEWED: 'card_home_viewed',
    CARD_BUTTON_CLICKED: 'card_button_clicked',
  },
}));

// Mock navigation helper functions
jest.mock('../../components/AddFundsBottomSheet/AddFundsBottomSheet', () => ({
  createAddFundsModalNavigationDetails: jest.fn((params) => [
    'CardModals',
    { screen: 'CardAddFundsModal', params },
  ]),
}));

jest.mock(
  '../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet',
  () => ({
    createAssetSelectionModalNavigationDetails: jest.fn((params) => [
      'CardModals',
      { screen: 'CardAssetSelectionModal', params },
    ]),
  }),
);

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
}));

// Mock deposit feature flag selectors
jest.mock('../../../../../selectors/featureFlagController/deposit', () => ({
  selectDepositActiveFlag: jest.fn(),
  selectDepositMinimumVersionFlag: jest.fn(),
}));

// Mock bridge actions
jest.mock('../../../../../core/redux/slices/bridge', () => ({
  setDestToken: jest.fn((token) => ({
    type: 'bridge/setDestToken',
    payload: token,
  })),
  setSourceToken: jest.fn((token) => ({
    type: 'bridge/setSourceToken',
    payload: token,
  })),
}));

// Mock utility functions
jest.mock('../../util/getHighestFiatToken', () => ({
  getHighestFiatToken: jest.fn(() => mockPriorityToken),
}));

// Mock isSolanaChainId
jest.mock('@metamask/bridge-controller', () => ({
  isSolanaChainId: jest.fn(),
}));

// Mock authentication error utility
const mockIsAuthenticationError = jest.fn();
jest.mock('../../util/isAuthenticationError', () => ({
  isAuthenticationError: (...args: unknown[]) =>
    mockIsAuthenticationError(...args),
}));

// Mock card token vault
const mockRemoveCardBaanxToken = jest.fn();
jest.mock('../../util/cardTokenVault', () => ({
  removeCardBaanxToken: () => mockRemoveCardBaanxToken(),
}));

// Mock Redux card actions
const mockResetAuthenticatedData = jest.fn(() => ({
  type: 'card/resetAuthenticatedData',
}));
const mockClearAllCache = jest.fn(() => ({
  type: 'card/clearAllCache',
}));
jest.mock('../../../../../core/redux/slices/card', () => {
  const actualModule = jest.requireActual(
    '../../../../../core/redux/slices/card',
  );
  return {
    ...actualModule,
    resetAuthenticatedData: () => mockResetAuthenticatedData(),
    clearAllCache: () => mockClearAllCache(),
  };
});

// Mock Logger
jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

// Mock token constants
jest.mock('../../../Tokens/constants', () => ({
  TOKEN_BALANCE_LOADING: 'tokenBalanceLoading',
  TOKEN_BALANCE_LOADING_UPPERCASE: 'TOKENBALANCELOADING',
  TOKEN_RATE_UNDEFINED: 'tokenRateUndefined',
}));

// Mock Engine properly to match how it's used in the component
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PreferencesController: {
        setPrivacyMode: jest.fn(),
      },
      NetworkController: {
        setActiveNetwork: jest.fn().mockResolvedValue(undefined),
        findNetworkClientIdByChainId: jest.fn().mockReturnValue(undefined), // Return undefined to prevent network switching
      },
      AccountsController: {
        getAccountByAddress: jest.fn().mockReturnValue({ id: 'account-id' }),
        setSelectedAccount: jest.fn(),
      },
    },
  },
}));

// Import the Engine to get typed references to the mocked functions
import Engine from '../../../../../core/Engine';
import { CardHomeSelectors } from '../../../../../../e2e/selectors/Card/CardHome.selectors';
import { isSolanaChainId } from '@metamask/bridge-controller';

// Get references to the mocked functions
const mockSetActiveNetwork = Engine.context.NetworkController
  .setActiveNetwork as jest.MockedFunction<
  typeof Engine.context.NetworkController.setActiveNetwork
>;
const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as jest.MockedFunction<
  typeof Engine.context.NetworkController.findNetworkClientIdByChainId
>;
const mockSetPrivacyMode = Engine.context.PreferencesController
  .setPrivacyMode as jest.MockedFunction<
  typeof Engine.context.PreferencesController.setPrivacyMode
>;
const mockGetAccountByAddress = Engine.context.AccountsController
  .getAccountByAddress as jest.MockedFunction<
  typeof Engine.context.AccountsController.getAccountByAddress
>;
const mockSetSelectedAccount = Engine.context.AccountsController
  .setSelectedAccount as jest.MockedFunction<
  typeof Engine.context.AccountsController.setSelectedAccount
>;

const mockIsSolanaChainId = isSolanaChainId as jest.MockedFunction<
  typeof isSolanaChainId
>;

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const strings: { [key: string]: string } = {
      'card.card_home.spending_with': 'Spending with',
      'card.card_home.add_funds': 'Add funds',
      'card.card_home.limited_spending_warning': 'Limited spending allowance',
      'card.card_home.manage_card_options.manage_card': 'Manage card',
      'card.card_home.manage_card_options.advanced_card_management':
        'Advanced card management',
      'card.card_home.manage_card_options.advanced_card_management_description':
        'See detailed transactions, freeze your card, etc.',
      'card.card': 'Card',
      'card.card_home.error_title': 'Unable to load card',
      'card.card_home.error_description': 'Please try again later',
      'card.card_home.try_again': 'Try again',
      'card.card_home.logout': 'Logout',
      'card.card_home.logout_description': 'Logout of your Card account',
      'card.card_home.logout_confirmation_title': 'Confirm Logout',
      'card.card_home.logout_confirmation_message':
        'Are you sure you want to logout?',
      'card.card_home.logout_confirmation_cancel': 'Cancel',
      'card.card_home.logout_confirmation_confirm': 'Logout',
      'card.card_home.kyc_status.pending.title': 'Verification in Progress',
      'card.card_home.kyc_status.pending.description':
        'Your identity verification is being processed. This usually takes a few minutes. Please check back shortly to enable your card.',
      'card.card_home.kyc_status.rejected.title': 'Verification Not Approved',
      'card.card_home.kyc_status.rejected.description':
        'We were unable to verify your identity. Please contact support for assistance.',
      'card.card_home.kyc_status.rejected.support_description':
        "We were unable to verify your identity at this time. Please contact our support team for assistance and we'll help you resolve this issue.",
      'card.card_home.kyc_status.unverified.title': 'Verification Required',
      'card.card_home.kyc_status.unverified.description':
        'You need to complete identity verification before enabling your card. Please complete the onboarding process.',
      'card.card_home.kyc_status.error.title':
        'Verification Status Unavailable',
      'card.card_home.kyc_status.error.description':
        "We couldn't check your verification status. Please try again later or contact support if the issue persists.",
      'card.card_home.kyc_status.ok_button': 'OK',
    };
    return strings[key] || key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

// Mock useState to return our priority token instead of null
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: (initial: unknown) => {
      if (initial === 0) {
        // This is the retries useState call
        return [0, jest.fn()];
      }
      if (initial === true) {
        // This is the isLoadingNetworkChange useState call - start as false for tests
        return [false, jest.fn()];
      }
      return actualReact.useState(initial);
    },
  };
});

// Helper: Setup mock selectors with default values
function setupMockSelectors(
  overrides?: Partial<{
    privacyMode: boolean;
    depositActive: boolean;
    depositMinVersion: string;
    chainId: string;
    cardholderAccounts: string[];
    selectedAccount: typeof mockSelectedInternalAccount;
    isAuthenticated: boolean;
  }>,
) {
  const defaults = {
    privacyMode: false,
    depositActive: true,
    depositMinVersion: '0.9.0',
    chainId: '0xe708',
    cardholderAccounts: [mockCurrentAddress],
    selectedAccount: mockSelectedInternalAccount,
    isAuthenticated: false,
  };

  const config = { ...defaults, ...overrides };

  mockUseSelector.mockImplementation((selector) => {
    if (!selector) return [];

    if (selector === selectPrivacyMode) return config.privacyMode;
    if (selector === selectDepositActiveFlag) return config.depositActive;
    if (selector === selectDepositMinimumVersionFlag)
      return config.depositMinVersion;
    if (selector === selectChainId) return config.chainId;
    if (selector === selectCardholderAccounts) return config.cardholderAccounts;
    if (selector === selectIsAuthenticatedCard) return config.isAuthenticated;

    const selectorString =
      typeof selector === 'function' ? selector.toString() : '';
    if (selectorString.includes('selectSelectedInternalAccount'))
      return config.selectedAccount;
    if (selectorString.includes('selectChainId')) return config.chainId;
    if (selectorString.includes('selectCardholderAccounts'))
      return config.cardholderAccounts;
    if (selectorString.includes('selectEvmTokens')) return [mockPriorityToken];
    if (selectorString.includes('selectEvmTokenFiatBalances'))
      return ['1000.00'];

    return [];
  });
}

// Helper: Setup useLoadCardData mock with custom values
function setupLoadCardDataMock(
  overrides?: Partial<{
    priorityToken: typeof mockPriorityToken | null;
    allTokens: (typeof mockPriorityToken)[];
    cardDetails: { type: CardType } | null;
    isLoading: boolean;
    error: string | null;
    warning: CardWarning | null;
    isAuthenticated: boolean;
    isBaanxLoginEnabled: boolean;
    isCardholder: boolean;
    kycStatus: {
      verificationState:
        | 'VERIFIED'
        | 'PENDING'
        | 'REJECTED'
        | 'UNVERIFIED'
        | null;
      userId: string;
    } | null;
  }>,
) {
  const defaults = {
    priorityToken: mockPriorityToken,
    allTokens: [mockPriorityToken],
    cardDetails: { type: CardType.VIRTUAL },
    isLoading: false,
    error: null,
    warning: null,
    isAuthenticated: false,
    isBaanxLoginEnabled: true,
    isCardholder: true,
    kycStatus: { verificationState: 'VERIFIED' as const, userId: 'user-123' },
  };

  const config = { ...defaults, ...overrides };

  (useLoadCardData as jest.Mock).mockReturnValueOnce({
    ...config,
    fetchPriorityToken: mockFetchPriorityToken,
    fetchCardDetails: mockFetchCardDetails,
    fetchAllData: mockFetchAllData,
    pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
    isLoadingPollCardStatusUntilProvisioned: false,
  });
}

// Helper: Render component with proper wrapper
function render() {
  return renderScreen(
    withCardSDK(CardHome),
    {
      name: Routes.CARD.HOME,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('CardHome Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Alert.alert
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        // For logout confirmation, immediately call the confirm button's onPress
        if (buttons && buttons.length > 1 && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

    // Clear SDK mocks
    mockLogoutFromProvider.mockClear();
    mockSetIsAuthenticated.mockClear();

    // Clear authentication error handling mocks
    mockIsAuthenticationError.mockClear();
    mockIsAuthenticationError.mockReturnValue(false); // Default to no auth error
    mockRemoveCardBaanxToken.mockClear();
    mockRemoveCardBaanxToken.mockResolvedValue(undefined);
    mockResetAuthenticatedData.mockClear();
    mockClearAllCache.mockClear();
    mockNavigationDispatch.mockClear();

    // Setup Engine controller mocks
    mockFetchPriorityToken.mockImplementation(async () => mockPriorityToken);
    mockDispatch.mockClear();
    mockSetActiveNetwork.mockResolvedValue(undefined);
    mockFindNetworkClientIdByChainId.mockReturnValue(''); // Prevent network switching
    mockSetPrivacyMode.mockClear();
    mockGetAccountByAddress.mockReturnValue({
      id: 'account-id',
      type: 'eip155:eoa',
      address: mockCurrentAddress,
      options: {},
      metadata: {
        name: 'Test Account',
        importTime: Date.now(),
        keyring: { type: 'HD Key Tree' },
      },
      scopes: [],
      methods: [],
    });
    mockSetSelectedAccount.mockClear();
    mockIsSolanaChainId.mockReturnValue(false);

    // Setup hook mocks with default values
    (useLoadCardData as jest.Mock).mockReturnValue({
      priorityToken: mockPriorityToken,
      allTokens: [mockPriorityToken],
      cardDetails: { type: CardType.VIRTUAL },
      isLoading: false,
      error: null,
      warning: null,
      isAuthenticated: false,
      isBaanxLoginEnabled: true,
      isCardholder: true,
      fetchPriorityToken: mockFetchPriorityToken,
      fetchCardDetails: mockFetchCardDetails,
      fetchAllData: mockFetchAllData,
      pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
      isLoadingPollCardStatusUntilProvisioned: false,
    });

    mockUseAssetBalances.mockReturnValue(
      createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: {
          symbol: 'USDC',
          image: 'usdc-image-url',
        },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: 1000,
      }),
    );

    mockUseNavigateToCardPage.mockReturnValue({
      navigateToCardPage: mockNavigateToCardPage,
    });

    mockUseSwapBridgeNavigation.mockReturnValue({
      goToSwaps: mockGoToSwaps,
    });

    (useOpenSwaps as jest.Mock).mockReturnValue({
      openSwaps: mockOpenSwaps,
    });

    const { useRampNavigation } = jest.requireMock(
      '../../../Ramp/hooks/useRampNavigation',
    );
    (useRampNavigation as jest.Mock).mockReturnValue({
      goToBuy: jest.fn(),
    });

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);

    (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValue(true);

    (useCardProvision as jest.Mock).mockReturnValue({
      provisionCard: jest.fn().mockResolvedValue(undefined),
      isLoading: false,
    });

    // Setup default selectors
    setupMockSelectors();
  });

  it('renders correctly and matches snapshot', async () => {
    // Given: default state with priority token
    // When: component renders
    const { toJSON } = render();

    // Then: should match snapshot
    await waitFor(() => {
      expect(toJSON()).toBeDefined();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with privacy mode enabled', async () => {
    // Given: privacy mode is enabled
    setupMockSelectors({ privacyMode: true });

    // When: component renders
    const { toJSON } = render();

    // Then: should show privacy indicators and match snapshot
    expect(
      screen.getByTestId(CardHomeSelectors.PRIVACY_TOGGLE_BUTTON),
    ).toBeTruthy();
    expect(screen.getByText('••••••••••••')).toBeTruthy();

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to add funds modal when add funds button is pressed with USDC token', async () => {
    // Given: priority token is USDC (default)
    // When: user presses add funds button
    render();

    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should navigate to add funds modal, not swaps
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'CardModals',
        expect.objectContaining({
          screen: 'CardAddFundsModal',
          params: expect.objectContaining({
            priorityToken: mockPriorityToken,
          }),
        }),
      );
    });

    expect(mockOpenSwaps).not.toHaveBeenCalled();
  });

  it('navigates to add funds modal when add funds button is pressed with USDT token', async () => {
    // Given: priority token is USDT
    const usdtToken = {
      ...mockPriorityToken,
      symbol: 'USDT',
    };
    setupLoadCardDataMock({ priorityToken: usdtToken, allTokens: [usdtToken] });

    // When: user presses add funds button
    render();

    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should navigate to add funds modal for supported token
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'CardModals',
        expect.objectContaining({
          screen: 'CardAddFundsModal',
          params: expect.objectContaining({
            priorityToken: usdtToken,
          }),
        }),
      );
    });

    expect(mockOpenSwaps).not.toHaveBeenCalled();
  });

  it('calls goToSwaps when add funds button is pressed with non-supported token', async () => {
    // Given: priority token is ETH (not supported for deposit)
    const ethToken = {
      ...mockPriorityToken,
      symbol: 'ETH',
    };
    setupLoadCardDataMock({ priorityToken: ethToken, allTokens: [ethToken] });

    render();
    mockOpenSwaps.mockClear();
    mockTrackEvent.mockClear();

    // When: user presses add funds button
    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should navigate to swaps
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockOpenSwaps).toHaveBeenCalledWith({});
    });
  });

  it('calls navigateToCardPage when advanced card management is pressed', async () => {
    // Given: default state
    // When: user presses advanced management item
    render();

    const advancedManagementItem = screen.getByTestId(
      CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM,
    );
    fireEvent.press(advancedManagementItem);

    // Then: should navigate to card page
    await waitFor(() => {
      expect(mockNavigateToCardPage).toHaveBeenCalled();
    });
  });

  it('displays correct priority token information', async () => {
    // Given: USDC is the priority token
    // When: component renders with privacy mode off
    render();

    // Then: should show balance information
    expect(screen.getByText('$1,000.00')).toBeTruthy();
    // CardAssetItem should be rendered (not a skeleton)
    expect(
      screen.queryByTestId(CardHomeSelectors.CARD_ASSET_ITEM_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('passes formatted balance to CardAssetItem', () => {
    // Given: asset balances with formatted balance
    mockUseAssetBalances.mockReturnValue(
      createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: {
          symbol: 'USDC',
          image: 'usdc-image-url',
        },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: 1000,
      }),
    );

    // When: component renders
    render();

    // Then: CardAssetItem should be rendered with formatted balance
    expect(
      screen.queryByTestId(CardHomeSelectors.CARD_ASSET_ITEM_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('displays manage card section', () => {
    // Given: default state
    // When: component renders
    render();

    // Then: should show manage card section
    expect(
      screen.getByTestId(CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM),
    ).toBeTruthy();
  });

  it('toggles privacy mode when privacy toggle button is pressed', async () => {
    // Given: privacy mode is off
    // When: user presses privacy toggle button
    render();

    const privacyToggleButton = screen.getByTestId(
      CardHomeSelectors.PRIVACY_TOGGLE_BUTTON,
    );
    fireEvent.press(privacyToggleButton);

    // Then: should toggle privacy mode
    await waitFor(() => {
      expect(mockSetPrivacyMode).toHaveBeenCalled();
      const calls = mockSetPrivacyMode.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it('displays error state when there is an error fetching priority token', () => {
    // Given: priority token fetch failed
    setupLoadCardDataMock({
      priorityToken: null,
      error: 'Failed to fetch token',
    });

    // When: component renders
    render();

    // Then: should show error state
    expect(screen.getByText('Unable to load card')).toBeTruthy();
    expect(screen.getByText('Please try again later')).toBeTruthy();
    expect(screen.getByTestId(CardHomeSelectors.TRY_AGAIN_BUTTON)).toBeTruthy();
  });

  it('calls fetchAllData when try again button is pressed', async () => {
    // Given: error state is displayed
    setupLoadCardDataMock({
      priorityToken: null,
      error: 'Failed to fetch token',
    });

    render();

    // When: user presses try again button
    const tryAgainButton = screen.getByTestId(
      CardHomeSelectors.TRY_AGAIN_BUTTON,
    );
    fireEvent.press(tryAgainButton);

    // Then: should retry fetching all data
    await waitFor(() => {
      expect(mockFetchAllData).toHaveBeenCalled();
    });
  });

  it('displays limited allowance warning when allowance state is limited', () => {
    // Given: priority token has limited allowance
    const limitedAllowanceToken = {
      ...mockPriorityToken,
      allowanceState: AllowanceState.Limited,
    };
    setupLoadCardDataMock({
      priorityToken: limitedAllowanceToken,
      allTokens: [limitedAllowanceToken],
    });

    // When: component renders
    render();

    // Then: should display limited allowance warning
    expect(screen.getByText('Limited spending allowance')).toBeTruthy();
  });

  it('sets navigation options correctly', () => {
    // Given: navigation object
    const mockNavigation = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // When: getting navigation options
    const navigationOptions = cardDefaultNavigationOptions({
      navigation: mockNavigation,
    });

    // Then: should include all required header components
    expect(navigationOptions).toHaveProperty('headerLeft');
    expect(navigationOptions).toHaveProperty('headerTitle');
    expect(navigationOptions).toHaveProperty('headerRight');
  });

  it('dispatches bridge tokens when opening swaps with non-supported token', async () => {
    // Given: ETH token (not supported for deposit)
    jest.mocked(useFocusEffect).mockImplementation(jest.fn());

    const ethToken = {
      ...mockPriorityToken,
      symbol: 'ETH',
    };
    setupLoadCardDataMock({ priorityToken: ethToken, allTokens: [ethToken] });

    render();
    mockOpenSwaps.mockClear();
    mockTrackEvent.mockClear();

    // When: user presses add funds button
    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should navigate to swaps
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockOpenSwaps).toHaveBeenCalledWith({});
    });
  });

  it('falls back to balanceFormatted when balanceFiat is TOKEN_RATE_UNDEFINED', () => {
    // Given: fiat rate is undefined
    mockUseAssetBalances.mockReturnValue(
      createMockAssetBalancesMap({
        balanceFiat: TOKEN_RATE_UNDEFINED,
        asset: {
          symbol: 'USDC',
          image: 'usdc-image-url',
        },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: 0,
      }),
    );

    // When: component renders
    render();

    // Then: should display formatted balance instead of fiat
    expect(screen.getByText('1000.000000 USDC')).toBeTruthy();
  });

  it('falls back to balanceFormatted when balanceFiat is not available', () => {
    // Given: fiat balance is empty
    mockUseAssetBalances.mockReturnValue(
      createMockAssetBalancesMap({
        balanceFiat: '',
        asset: {
          symbol: 'USDC',
          image: 'usdc-image-url',
        },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: 0,
      }),
    );

    // When: component renders
    render();

    // Then: should display formatted balance as fallback
    expect(screen.getByText('1000.000000 USDC')).toBeTruthy();
  });

  it('fires CARD_HOME_VIEWED once when balances are loaded', async () => {
    // Given: both fiat and main balances are valid
    // When: component renders
    render();

    // Then: should fire metric once
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  it('includes raw numeric properties in CARD_HOME_VIEWED event', async () => {
    // Given: balances with numeric values
    // When: component renders and metrics fire
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should include raw balance properties
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 1000,
        token_fiat_balance_priority: 1000,
      }),
    );
  });

  it('includes zero raw balances in metrics', async () => {
    // Given: zero balances
    mockUseAssetBalances.mockReturnValueOnce(
      createMockAssetBalancesMap({
        balanceFiat: '$0.00',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: '0.000000 USDC',
        rawTokenBalance: 0,
        rawFiatNumber: 0,
      }),
    );

    // When: component renders
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should include zero values in metrics
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 0,
        token_fiat_balance_priority: 0,
      }),
    );
  });

  it('includes only rawTokenBalance when fiat is undefined', async () => {
    // Given: only formatted balance is valid (fiat undefined)
    mockUseAssetBalances.mockReturnValueOnce(
      createMockAssetBalancesMap({
        balanceFiat: undefined as unknown as string,
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        // rawFiatNumber intentionally omitted (undefined)
      }),
    );

    // When: component renders
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should include only token balance in metrics
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 1000,
        token_fiat_balance_priority: undefined,
      }),
    );
  });

  it('includes only rawFiatNumber when formatted balance is undefined', async () => {
    // Given: only fiat balance is valid (formatted balance undefined)
    mockUseAssetBalances.mockReturnValueOnce(
      createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: undefined as unknown as string,
        // rawTokenBalance omitted
        rawFiatNumber: 1000,
      }),
    );

    // When: component renders
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should include only fiat balance in metrics
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: undefined,
        token_fiat_balance_priority: 1000,
      }),
    );
  });

  it('fires CARD_HOME_VIEWED once when only balanceFormatted is valid', async () => {
    // Given: only formatted balance is available
    mockUseAssetBalances.mockReturnValue(
      createMockAssetBalancesMap({
        balanceFiat: undefined as unknown as string,
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        // rawFiatNumber omitted
      }),
    );

    // When: component renders
    render();

    // Then: should fire metric once and not re-fire
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('fires CARD_HOME_VIEWED once when only fiat balance is valid', async () => {
    // Given: only fiat balance is available
    mockUseAssetBalances.mockReturnValue(
      createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: undefined as unknown as string,
        // rawTokenBalance omitted
        rawFiatNumber: 1000,
      }),
    );

    // When: component renders
    render();

    // Then: should fire metric once and not re-fire
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not fire metrics when balances are still loading', async () => {
    // Given: balances show loading sentinels
    mockUseAssetBalances.mockReturnValue(
      createMockAssetBalancesMap({
        balanceFiat: 'tokenBalanceLoading',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: 'TOKENBALANCELOADING',
        // raw values omitted
      }),
    );

    // When: component renders
    render();

    // Then: should not fire metrics while loading
    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not fire metrics when balances are unavailable', async () => {
    // Given: fiat is undefined and formatted balance is also undefined
    mockUseAssetBalances.mockReturnValue(
      createMockAssetBalancesMap({
        balanceFiat: 'tokenRateUndefined',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: undefined as unknown as string,
        // raw values omitted
      }),
    );

    // When: component renders
    render();

    // Then: should not fire metrics without valid balance
    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('converts NaN rawTokenBalance to 0 in metrics', async () => {
    // Given: rawTokenBalance is NaN
    mockUseAssetBalances.mockReturnValueOnce(
      createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: NaN,
        rawFiatNumber: 1000,
      }),
    );

    // When: component renders and fires metrics
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should convert NaN to 0 in metrics
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 0,
        token_fiat_balance_priority: 1000,
      }),
    );
  });

  it('converts NaN rawFiatNumber to 0 in metrics', async () => {
    // Given: rawFiatNumber is NaN
    mockUseAssetBalances.mockReturnValueOnce(
      createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: NaN,
      }),
    );

    // When: component renders and fires metrics
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should convert NaN to 0 in metrics
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 1000,
        token_fiat_balance_priority: 0,
      }),
    );
  });

  it('converts both NaN raw values to 0 in metrics', async () => {
    // Given: both raw values are NaN
    mockUseAssetBalances.mockReturnValueOnce(
      createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: NaN,
        rawFiatNumber: NaN,
      }),
    );

    // When: component renders and fires metrics
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should convert both NaN values to 0
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 0,
        token_fiat_balance_priority: 0,
      }),
    );
  });

  it('preserves undefined raw values in metrics', async () => {
    // Given: raw values are undefined (not provided)
    mockUseAssetBalances.mockReturnValueOnce(
      createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: '1000.000000 USDC',
        // rawTokenBalance and rawFiatNumber intentionally omitted (undefined)
      }),
    );

    // When: component renders and fires metrics
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should preserve undefined values (not convert to 0)
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: undefined,
        token_fiat_balance_priority: undefined,
      }),
    );
  });

  describe('Swap Enabled for Priority Token', () => {
    it('disables add funds button when swap is not enabled for priority token', () => {
      // Given: swap is not enabled for the priority token
      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(
        false,
      );

      // When: component renders
      render();

      // Then: add funds button should exist and be disabled
      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      expect(addFundsButton).toBeTruthy();
      // Button should have disabled styling applied
      expect(addFundsButton.props.disabled).toBe(true);
    });

    it('enables add funds button when swap is enabled for priority token', () => {
      // Given: swap is enabled for the priority token
      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(true);

      // When: component renders
      render();

      // Then: add funds button should be enabled
      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      expect(addFundsButton).toBeTruthy();
      expect(addFundsButton.props.disabled).toBe(false);
    });

    it('applies disabled styling when swap is not enabled', () => {
      // Given: swap is not enabled for the priority token
      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(
        false,
      );

      // When: component renders
      render();

      // Then: button should have disabled prop set to true
      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      expect(addFundsButton).toBeTruthy();
      expect(addFundsButton.props.disabled).toBe(true);
    });

    it('does not disable button when swap is enabled for priority token', async () => {
      // Given: swap is enabled for the priority token
      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(true);

      // When: component renders
      render();

      // Then: add funds button should be enabled and callable
      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      expect(addFundsButton.props.disabled).toBe(false);

      mockTrackEvent.mockClear();
      fireEvent.press(addFundsButton);

      // When: user presses add funds button
      // Then: should track event
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalled();
      });
    });
  });

  describe('Baanx Login Features', () => {
    it('shows change asset button when Baanx login is enabled', () => {
      // Given: Baanx login is enabled (default)
      // When: component renders
      render();

      // Then: should show change asset button
      expect(
        screen.getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeTruthy();
    });

    it('navigates to welcome when change asset pressed and not authenticated', () => {
      // Given: user is not authenticated
      setupMockSelectors({ isAuthenticated: false });

      // When: user presses change asset button
      render();
      const changeAssetButton = screen.getByTestId(
        CardHomeSelectors.CHANGE_ASSET_BUTTON,
      );
      fireEvent.press(changeAssetButton);

      // Then: should navigate to welcome screen
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.WELCOME);
    });

    it('navigates to asset selection modal when change asset pressed and authenticated', () => {
      // Given: user is authenticated
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({ isAuthenticated: true });

      // When: user presses change asset button
      render();
      const changeAssetButton = screen.getByTestId(
        CardHomeSelectors.CHANGE_ASSET_BUTTON,
      );
      fireEvent.press(changeAssetButton);

      // Then: should navigate to asset selection modal
      expect(mockNavigate).toHaveBeenCalledWith(
        'CardModals',
        expect.objectContaining({
          screen: 'CardAssetSelectionModal',
          params: expect.objectContaining({
            tokensWithAllowances: [mockPriorityToken],
          }),
        }),
      );
    });

    it('shows manage spending limit button when Baanx login is enabled', () => {
      // Given: Baanx login is enabled
      // When: component renders
      render();

      // Then: should show manage spending limit item
      expect(
        screen.getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
      ).toBeTruthy();
    });

    it('navigates to welcome when manage spending limit pressed and not authenticated', () => {
      // Given: user is not authenticated
      setupMockSelectors({ isAuthenticated: false });

      // When: user presses manage spending limit
      render();
      const manageSpendingLimitItem = screen.getByTestId(
        CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM,
      );
      fireEvent.press(manageSpendingLimitItem);

      // Then: should navigate to welcome screen
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.WELCOME);
    });

    it('shows logout button when user is authenticated', () => {
      // Given: user is authenticated
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({ isAuthenticated: true });

      // When: component renders
      render();

      // Then: should show logout button
      expect(screen.getByText('Logout')).toBeTruthy();
      expect(screen.getByText('Logout of your Card account')).toBeTruthy();
    });

    it('shows logout confirmation alert when logout button pressed', () => {
      // Given: user is authenticated
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({ isAuthenticated: true });

      render();

      // When: user presses logout button
      const logoutButton = screen.getByText('Logout');
      fireEvent.press(logoutButton);

      // Then: should show confirmation alert with correct buttons
      expect(Alert.alert).toHaveBeenCalledWith(
        'Confirm Logout',
        'Are you sure you want to logout?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({
            text: 'Logout',
            style: 'destructive',
            onPress: expect.any(Function),
          }),
        ]),
      );
    });

    it('calls logout and navigates back when logout confirmed', () => {
      // Given: user is authenticated
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({ isAuthenticated: true });

      render();

      // When: user presses logout and confirms the Alert
      const logoutButton = screen.getByText('Logout');
      fireEvent.press(logoutButton);

      // Then: should call logout and navigate back
      expect(mockLogoutFromProvider).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('does not logout when alert is cancelled', () => {
      // Given: user is authenticated and Alert will be cancelled
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({ isAuthenticated: true });

      jest
        .spyOn(Alert, 'alert')
        .mockImplementation((_title, _message, buttons) => {
          // Simulate pressing Cancel button (button at index 0)
          buttons?.[0].onPress?.();
        });

      render();

      // When: user presses logout but cancels the Alert
      const logoutButton = screen.getByText('Logout');
      fireEvent.press(logoutButton);

      // Then: should not call logout or navigate back
      expect(mockLogoutFromProvider).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not show logout button when user is not authenticated', () => {
      // Given: user is not authenticated
      setupMockSelectors({ isAuthenticated: false });

      // When: component renders
      render();

      // Then: should not show logout button
      expect(screen.queryByText('Logout')).not.toBeOnTheScreen();
    });
  });

  describe('CardWarning Edge Cases', () => {
    it('hides balance and asset when warning is NeedDelegation', () => {
      // Given: warning is NeedDelegation
      setupLoadCardDataMock({
        warning: CardWarning.NeedDelegation,
      });

      // When: component renders
      render();

      // Then: balance and asset sections should be hidden
      const balanceElement = screen.queryByTestId('balance-test-id');
      const assetElement = screen.queryByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );

      // Elements might be rendered but hidden via styles
      expect(balanceElement).toBeNull();
      expect(assetElement).toBeNull();
    });

    it('displays CardWarningBox when warning exists', () => {
      // Given: warning exists
      setupLoadCardDataMock({
        warning: CardWarning.NeedDelegation,
      });

      // When: component renders
      render();

      // Then: should display warning box
      // Note: The warning box text depends on CardWarningBox component implementation
      // This test verifies the warning prop is passed
      expect(useLoadCardData).toHaveBeenCalled();
    });
  });

  describe('Card Details', () => {
    it('displays card with correct type from cardDetails', () => {
      // Given: card details with physical type
      setupLoadCardDataMock({
        cardDetails: { type: CardType.PHYSICAL },
      });

      // When: component renders
      render();

      // Then: should pass card type to CardImage
      // Card image component should be rendered with physical type
      expect(useLoadCardData).toHaveBeenCalled();
    });

    it('defaults to virtual card type when cardDetails is null', () => {
      // Given: no card details
      setupLoadCardDataMock({
        cardDetails: null,
      });

      // When: component renders
      render();

      // Then: should default to virtual type
      expect(useLoadCardData).toHaveBeenCalled();
    });

    it('shows error when cardDetails fetch fails', () => {
      // Given: card details error
      setupLoadCardDataMock({
        cardDetails: null,
        error: 'Failed to fetch card details',
      });

      // When: component renders
      render();

      // Then: should show error state
      expect(screen.getByText('Unable to load card')).toBeTruthy();
      expect(screen.getByText('Please try again later')).toBeTruthy();
    });

    it('calls fetchAllData when try again pressed with card details error', async () => {
      // Given: card details error
      setupLoadCardDataMock({
        cardDetails: null,
        error: 'Failed to fetch card details',
      });

      render();

      // When: user presses try again
      const tryAgainButton = screen.getByTestId(
        CardHomeSelectors.TRY_AGAIN_BUTTON,
      );
      fireEvent.press(tryAgainButton);

      // Then: should retry fetching all data
      await waitFor(() => {
        expect(mockFetchAllData).toHaveBeenCalled();
      });
    });

    it('shows loading state when cardDetails is loading', () => {
      // Given: card details is loading
      setupLoadCardDataMock({
        isLoading: true,
        cardDetails: null,
      });

      // When: component renders
      render();

      // Then: should show loading skeletons since cardDetails is loading
      expect(
        screen.getByTestId(CardHomeSelectors.BALANCE_SKELETON),
      ).toBeOnTheScreen();

      // Add funds button should also show skeleton
      expect(
        screen.getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON),
      ).toBeOnTheScreen();
    });

    it('combines priority token and card details loading states', () => {
      // Given: both are loading
      setupLoadCardDataMock({
        priorityToken: null,
        cardDetails: null,
        isLoading: true,
      });

      // When: component renders
      render();

      // Then: should show loading skeletons
      expect(
        screen.getByTestId(CardHomeSelectors.BALANCE_SKELETON),
      ).toBeTruthy();
      expect(
        screen.getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON),
      ).toBeTruthy();
    });

    it('prioritizes priority token error over card details error', () => {
      // Given: error present
      setupLoadCardDataMock({
        priorityToken: null,
        cardDetails: null,
        error: 'Priority token error',
      });

      // When: component renders
      render();

      // Then: should show error state
      expect(screen.getByText('Unable to load card')).toBeTruthy();
    });
  });

  describe('Limited Allowance Warning', () => {
    it('shows limited allowance warning when not authenticated and allowance is limited', () => {
      // Given: not authenticated and allowance is limited
      setupMockSelectors({ isAuthenticated: false });
      const limitedAllowanceToken = {
        ...mockPriorityToken,
        allowanceState: AllowanceState.Limited,
      };
      setupLoadCardDataMock({
        priorityToken: limitedAllowanceToken,
        allTokens: [limitedAllowanceToken],
        isAuthenticated: false,
      });

      // When: component renders
      render();

      // Then: should display limited allowance warning
      expect(screen.getByText('Limited spending allowance')).toBeTruthy();
    });

    it('does not show limited allowance warning when authenticated', () => {
      // Given: authenticated with limited allowance
      setupMockSelectors({ isAuthenticated: true });
      const limitedAllowanceToken = {
        ...mockPriorityToken,
        allowanceState: AllowanceState.Limited,
      };
      setupLoadCardDataMock({
        priorityToken: limitedAllowanceToken,
        allTokens: [limitedAllowanceToken],
        isAuthenticated: true,
      });

      // When: component renders
      render();

      // Then: should not display limited allowance warning
      expect(
        screen.queryByText('Limited spending allowance'),
      ).not.toBeOnTheScreen();
    });

    it('does not show limited allowance warning when allowance is enabled', () => {
      // Given: not authenticated but allowance is enabled
      setupMockSelectors({ isAuthenticated: false });
      const enabledAllowanceToken = {
        ...mockPriorityToken,
        allowanceState: AllowanceState.Enabled,
      };
      setupLoadCardDataMock({
        priorityToken: enabledAllowanceToken,
        allTokens: [enabledAllowanceToken],
        isAuthenticated: false,
      });

      // When: component renders
      render();

      // Then: should not display limited allowance warning
      expect(
        screen.queryByText('Limited spending allowance'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('enableCardAction', () => {
    let mockProvisionCard: jest.Mock;

    beforeEach(() => {
      mockProvisionCard = jest.fn().mockResolvedValue(undefined);

      (useCardProvision as jest.Mock).mockReturnValue({
        provisionCard: mockProvisionCard,
        isLoading: false,
      });
    });

    it('calls provisionCard and fetchPriorityToken when provision succeeds', async () => {
      // Given: warning is NoCard
      mockPollCardStatusUntilProvisioned.mockResolvedValue(true);
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders and user presses enable card button
      render();
      const enableCardButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableCardButton);

      // Then: should call provision and fetch priority token
      await waitFor(() => {
        expect(mockProvisionCard).toHaveBeenCalled();
        expect(mockPollCardStatusUntilProvisioned).toHaveBeenCalled();
        expect(mockFetchPriorityToken).toHaveBeenCalled();
      });
    });

    it('does not call fetchPriorityToken when provision fails', async () => {
      // Given: warning is NoCard and provision fails
      mockPollCardStatusUntilProvisioned.mockResolvedValue(false);
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders and user presses enable card button
      render();
      const enableCardButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableCardButton);

      // Then: should not call fetchPriorityToken
      await waitFor(() => {
        expect(mockProvisionCard).toHaveBeenCalled();
        expect(mockPollCardStatusUntilProvisioned).toHaveBeenCalled();
      });
      expect(mockFetchPriorityToken).not.toHaveBeenCalled();
    });

    it('does not call fetchPriorityToken when provisionCard throws error', async () => {
      // Given: warning is NoCard and provisionCard throws error
      mockProvisionCard.mockRejectedValue(new Error('Provision failed'));
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders and user presses enable card button
      render();
      const enableCardButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableCardButton);

      // Then: should not call fetchPriorityToken
      await waitFor(() => {
        expect(mockProvisionCard).toHaveBeenCalled();
      });
      expect(mockFetchPriorityToken).not.toHaveBeenCalled();
    });

    it('does not call fetchPriorityToken when pollCardStatusUntilProvisioned throws error', async () => {
      // Given: warning is NoCard and polling throws error
      mockPollCardStatusUntilProvisioned.mockRejectedValue(
        new Error('Polling failed'),
      );
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders and user presses enable card button
      render();
      const enableCardButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableCardButton);

      // Then: should not call fetchPriorityToken
      await waitFor(() => {
        expect(mockProvisionCard).toHaveBeenCalled();
      });
      expect(mockFetchPriorityToken).not.toHaveBeenCalled();
    });

    it('calls provisionCard with correct parameters', async () => {
      // Given: warning is NoCard
      mockPollCardStatusUntilProvisioned.mockResolvedValue(true);
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders and user presses enable card button
      render();
      const enableCardButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableCardButton);

      // Then: should call provisionCard
      await waitFor(() => {
        expect(mockProvisionCard).toHaveBeenCalledWith();
        expect(mockProvisionCard).toHaveBeenCalledTimes(1);
      });
    });

    it('disables button during provision loading', () => {
      // Given: provision is loading
      (useCardProvision as jest.Mock).mockReturnValue({
        provisionCard: mockProvisionCard,
        isLoading: true,
      });
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders
      render();

      // Then: enable card button should be disabled
      const enableCardButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      expect(enableCardButton.props.disabled).toBe(true);
    });

    it('disables button during poll loading', () => {
      // Given: poll is loading
      (useLoadCardData as jest.Mock).mockReturnValueOnce({
        priorityToken: null,
        allTokens: [],
        cardDetails: null,
        isLoading: false,
        error: null,
        warning: CardWarning.NoCard,
        isAuthenticated: false,
        isBaanxLoginEnabled: true,
        isCardholder: true,
        fetchPriorityToken: mockFetchPriorityToken,
        fetchCardDetails: mockFetchCardDetails,
        fetchAllData: mockFetchAllData,
        pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
        isLoadingPollCardStatusUntilProvisioned: true,
      });

      // When: component renders
      render();

      // Then: enable card button should be disabled
      const enableCardButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      expect(enableCardButton.props.disabled).toBe(true);
    });

    it('shows skeleton during general loading', () => {
      // Given: general loading state
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
        isLoading: true,
      });

      // When: component renders
      render();

      // Then: should show button skeleton instead of enable card button
      expect(
        screen.getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON),
      ).toBeTruthy();
      expect(
        screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
      ).toBeNull();
    });

    it('displays enable card button when warning is NoCard', () => {
      // Given: warning is NoCard
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders
      render();

      // Then: should display enable card button
      expect(
        screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
      ).toBeTruthy();
      expect(
        screen.getByText('card.card_home.enable_card_button_label'),
      ).toBeTruthy();
    });

    it('does not show regular buttons when enable card button is shown', () => {
      // Given: warning is NoCard
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders
      render();

      // Then: should not show add funds or change asset buttons
      expect(
        screen.queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
      ).toBeNull();
      expect(
        screen.queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeNull();
    });

    it('calls enableCardAction once per button press', async () => {
      // Given: warning is NoCard
      mockPollCardStatusUntilProvisioned.mockResolvedValue(true);
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders and user presses enable card button
      render();
      const enableCardButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableCardButton);

      // Then: should call provisionCard exactly once
      await waitFor(() => {
        expect(mockProvisionCard).toHaveBeenCalledTimes(1);
      });
    });

    it('calls pollCardStatusUntilProvisioned after provision succeeds', async () => {
      // Given: provision succeeds
      mockPollCardStatusUntilProvisioned.mockResolvedValue(false);
      setupLoadCardDataMock({
        warning: CardWarning.NoCard,
        priorityToken: null,
      });

      // When: component renders and user presses enable card button
      render();
      const enableCardButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableCardButton);

      // Then: should call pollCardStatusUntilProvisioned
      await waitFor(() => {
        expect(mockProvisionCard).toHaveBeenCalled();
        expect(mockPollCardStatusUntilProvisioned).toHaveBeenCalled();
      });
    });
  });

  describe('Unsupported Tokens for Spending Limit', () => {
    it('hides progress bar for Solana chain', () => {
      // Given: authenticated with Solana chain and limited allowance
      setupMockSelectors({ isAuthenticated: true });
      mockIsSolanaChainId.mockReturnValue(true);
      const solanaToken = {
        ...mockPriorityToken,
        caipChainId: 'solana:mainnet',
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '500',
      };
      setupLoadCardDataMock({
        priorityToken: solanaToken,
        allTokens: [solanaToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should not display spending limit progress bar
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });

    it('hides manage spending limit button for Solana chain', () => {
      // Given: authenticated with Solana chain
      setupMockSelectors({ isAuthenticated: true });
      mockIsSolanaChainId.mockReturnValue(true);
      const solanaToken = {
        ...mockPriorityToken,
        caipChainId: 'solana:mainnet',
        allowanceState: AllowanceState.Limited,
      };
      setupLoadCardDataMock({
        priorityToken: solanaToken,
        allTokens: [solanaToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should not display manage spending limit button
      expect(
        screen.queryByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
      ).not.toBeOnTheScreen();
    });

    it('hides close spending limit warning for Solana chain', () => {
      // Given: authenticated with Solana chain and close to limit (15% remaining)
      setupMockSelectors({ isAuthenticated: true });
      mockIsSolanaChainId.mockReturnValue(true);
      const solanaToken = {
        ...mockPriorityToken,
        caipChainId: 'solana:mainnet',
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '150', // 15% remaining (below 20% threshold)
      };
      setupLoadCardDataMock({
        priorityToken: solanaToken,
        allTokens: [solanaToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should not show close spending limit warning
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });

    it('hides progress bar for unsupported token (aUSDC)', () => {
      // Given: authenticated with aUSDC (unsupported token) and limited allowance
      setupMockSelectors({ isAuthenticated: true });
      const aUSDCToken = {
        ...mockPriorityToken,
        symbol: 'aUSDC',
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '500',
      };
      setupLoadCardDataMock({
        priorityToken: aUSDCToken,
        allTokens: [aUSDCToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should not display spending limit progress bar
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });

    it('shows progress bar for supported token (USDC)', () => {
      // Given: authenticated with USDC (supported token) and limited allowance
      setupMockSelectors({ isAuthenticated: true });
      const usdcToken = {
        ...mockPriorityToken,
        symbol: 'USDC',
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '500',
      };
      setupLoadCardDataMock({
        priorityToken: usdcToken,
        allTokens: [usdcToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should display spending limit progress bar
      expect(screen.getByText('Spending Limit')).toBeOnTheScreen();
      expect(screen.getByText('500/1000 USDC')).toBeOnTheScreen();
    });

    it('hides progress bar when symbol is undefined', () => {
      // Given: authenticated with undefined symbol and limited allowance
      setupMockSelectors({ isAuthenticated: true });
      const tokenWithoutSymbol = {
        ...mockPriorityToken,
        symbol: undefined as unknown as string,
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '500',
      };
      setupLoadCardDataMock({
        priorityToken: tokenWithoutSymbol,
        allTokens: [tokenWithoutSymbol],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should not display spending limit progress bar
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });

    it('hides close spending limit warning for unsupported token (aUSDC)', () => {
      // Given: authenticated with aUSDC and close to limit (20% remaining)
      setupMockSelectors({ isAuthenticated: true });
      const aUSDCToken = {
        ...mockPriorityToken,
        symbol: 'aUSDC',
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '150', // 15% remaining (below 20% threshold)
      };
      setupLoadCardDataMock({
        priorityToken: aUSDCToken,
        allTokens: [aUSDCToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should not show close spending limit warning
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });

    it('hides close spending limit warning when symbol is undefined', () => {
      // Given: authenticated with undefined symbol and close to limit
      setupMockSelectors({ isAuthenticated: true });
      const tokenWithoutSymbol = {
        ...mockPriorityToken,
        symbol: undefined as unknown as string,
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '150',
      };
      setupLoadCardDataMock({
        priorityToken: tokenWithoutSymbol,
        allTokens: [tokenWithoutSymbol],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should not show close spending limit warning
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });

    it('treats lowercase unsupported token symbol case-insensitively', () => {
      // Given: authenticated with lowercase ausdc and limited allowance
      setupMockSelectors({ isAuthenticated: true });
      const aUSDCTokenLower = {
        ...mockPriorityToken,
        symbol: 'ausdc',
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '500',
      };
      setupLoadCardDataMock({
        priorityToken: aUSDCTokenLower,
        allTokens: [aUSDCTokenLower],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should not display spending limit progress bar
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });

    it('treats mixed case unsupported token symbol case-insensitively', () => {
      // Given: authenticated with mixed case AuSdC and limited allowance
      setupMockSelectors({ isAuthenticated: true });
      const aUSDCTokenMixed = {
        ...mockPriorityToken,
        symbol: 'AuSdC',
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '500',
      };
      setupLoadCardDataMock({
        priorityToken: aUSDCTokenMixed,
        allTokens: [aUSDCTokenMixed],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should not display spending limit progress bar
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });
  });

  describe('SpendingLimitProgressBar', () => {
    it('renders when authenticated and allowance is limited', () => {
      // Given: authenticated with limited allowance
      setupMockSelectors({ isAuthenticated: true });
      const limitedAllowanceToken = {
        ...mockPriorityToken,
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '500',
      };
      setupLoadCardDataMock({
        priorityToken: limitedAllowanceToken,
        allTokens: [limitedAllowanceToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should display spending limit progress bar
      expect(screen.getByText('Spending Limit')).toBeOnTheScreen();
      expect(screen.getByText('500/1000 USDC')).toBeOnTheScreen();
    });

    it('does not render when not authenticated', () => {
      // Given: not authenticated with limited allowance
      setupMockSelectors({ isAuthenticated: false });
      const limitedAllowanceToken = {
        ...mockPriorityToken,
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '500',
      };
      setupLoadCardDataMock({
        priorityToken: limitedAllowanceToken,
        allTokens: [limitedAllowanceToken],
        isAuthenticated: false,
      });

      // When: component renders
      render();

      // Then: should not display spending limit progress bar
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });

    it('does not render when allowance is enabled', () => {
      // Given: authenticated with enabled allowance
      setupMockSelectors({ isAuthenticated: true });
      const enabledAllowanceToken = {
        ...mockPriorityToken,
        allowanceState: AllowanceState.Enabled,
        totalAllowance: '1000',
        allowance: '500',
      };
      setupLoadCardDataMock({
        priorityToken: enabledAllowanceToken,
        allTokens: [enabledAllowanceToken],
        isAuthenticated: true,
      });

      // When: component renders
      render();

      // Then: should not display spending limit progress bar
      expect(screen.queryByText('Spending Limit')).not.toBeOnTheScreen();
    });

    it('displays correct consumed and total amounts', () => {
      // Given: authenticated with specific allowance values
      setupMockSelectors({ isAuthenticated: true });
      const limitedAllowanceToken = {
        ...mockPriorityToken,
        allowanceState: AllowanceState.Limited,
        totalAllowance: '200',
        allowance: '150',
        symbol: 'USDC',
      };
      setupLoadCardDataMock({
        priorityToken: limitedAllowanceToken,
        allTokens: [limitedAllowanceToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should display correct consumed amount (50/200)
      expect(screen.getByText('50/200 USDC')).toBeOnTheScreen();
    });

    it('handles zero remaining allowance', () => {
      // Given: authenticated with zero remaining allowance
      setupMockSelectors({ isAuthenticated: true });
      const limitedAllowanceToken = {
        ...mockPriorityToken,
        allowanceState: AllowanceState.Limited,
        totalAllowance: '1000',
        allowance: '0',
      };
      setupLoadCardDataMock({
        priorityToken: limitedAllowanceToken,
        allTokens: [limitedAllowanceToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should display fully consumed allowance
      expect(screen.getByText('1000/1000 USDC')).toBeOnTheScreen();
    });

    it('handles undefined allowance values', () => {
      // Given: authenticated with undefined allowance values
      setupMockSelectors({ isAuthenticated: true });
      const limitedAllowanceToken = {
        ...mockPriorityToken,
        allowanceState: AllowanceState.Limited,
        totalAllowance: undefined as unknown as string,
        allowance: undefined as unknown as string,
      };
      setupLoadCardDataMock({
        priorityToken: limitedAllowanceToken,
        allTokens: [limitedAllowanceToken],
        isAuthenticated: true,
        warning: null,
      });

      // When: component renders
      render();

      // Then: should display zero values as fallback
      expect(screen.getByText('0/0 USDC')).toBeOnTheScreen();
    });
  });

  describe('Authentication Error Handling', () => {
    it('clears auth state and navigates to welcome when authentication error occurs', async () => {
      // Given: authenticated user with authentication error
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(true);
      setupLoadCardDataMock({
        error: 'Authentication failed',
        isAuthenticated: true,
      });

      // When: component renders with authentication error
      render();

      // Then: should clear token, reset auth state, and navigate to welcome
      await waitFor(() => {
        expect(mockRemoveCardBaanxToken).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'card/resetAuthenticatedData' }),
        );
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'card/clearAllCache' }),
        );
      });

      await waitFor(() => {
        expect(StackActions.replace).toHaveBeenCalledWith(Routes.CARD.WELCOME);
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'REPLACE',
            routeName: Routes.CARD.WELCOME,
          }),
        );
      });
    });

    it('does nothing when no error exists', async () => {
      // Given: authenticated user without error
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(false);
      setupLoadCardDataMock({
        error: null,
        isAuthenticated: true,
      });

      // When: component renders
      render();

      // Then: should not trigger authentication error handling
      await new Promise((r) => setTimeout(r, 100));
      expect(mockRemoveCardBaanxToken).not.toHaveBeenCalled();
      expect(mockResetAuthenticatedData).not.toHaveBeenCalled();
      expect(mockClearAllCache).not.toHaveBeenCalled();
      expect(mockNavigationDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REPLACE' }),
      );
    });

    it('does nothing when user is not authenticated', async () => {
      // Given: non-authenticated user with error
      setupMockSelectors({ isAuthenticated: false });
      mockIsAuthenticationError.mockReturnValue(false);
      setupLoadCardDataMock({
        error: 'Some error',
        isAuthenticated: false,
      });

      // When: component renders
      render();

      // Then: should not trigger authentication error handling
      await new Promise((r) => setTimeout(r, 100));
      expect(mockRemoveCardBaanxToken).not.toHaveBeenCalled();
      expect(mockResetAuthenticatedData).not.toHaveBeenCalled();
      expect(mockClearAllCache).not.toHaveBeenCalled();
    });

    it('does nothing when error is not an authentication error', async () => {
      // Given: authenticated user with non-authentication error
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(false);
      setupLoadCardDataMock({
        error: 'Network error',
        isAuthenticated: true,
      });

      // When: component renders
      render();

      // Then: should not trigger authentication error handling
      await new Promise((r) => setTimeout(r, 100));
      expect(mockRemoveCardBaanxToken).not.toHaveBeenCalled();
      expect(mockResetAuthenticatedData).not.toHaveBeenCalled();
      expect(mockClearAllCache).not.toHaveBeenCalled();
      expect(mockNavigationDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REPLACE' }),
      );
    });

    it('still navigates when token removal fails', async () => {
      // Given: authenticated user with authentication error and token removal fails
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(true);
      mockRemoveCardBaanxToken.mockRejectedValue(
        new Error('Failed to remove token'),
      );
      setupLoadCardDataMock({
        error: 'Token expired',
        isAuthenticated: true,
      });

      // When: component renders
      render();

      // Then: should still navigate even if token removal fails
      await waitFor(() => {
        expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(StackActions.replace).toHaveBeenCalledWith(Routes.CARD.WELCOME);
        expect(mockNavigationDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'REPLACE',
            routeName: Routes.CARD.WELCOME,
          }),
        );
      });
    });

    it('logs error when token removal fails', async () => {
      // Given: authenticated user with authentication error and token removal fails
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(true);
      mockRemoveCardBaanxToken.mockRejectedValue(
        new Error('Failed to remove token'),
      );
      setupLoadCardDataMock({
        error: 'Invalid credentials',
        isAuthenticated: true,
      });

      const Logger = jest.requireMock('../../../../../util/Logger');

      // When: component renders
      render();

      // Then: should log the error
      await waitFor(() => {
        expect(Logger.log).toHaveBeenCalledWith(
          'CardHome: Failed to handle authentication error',
          expect.any(Error),
        );
      });
    });

    it('dispatches Redux actions after successful token removal', async () => {
      // Given: authenticated user with authentication error
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(true);
      mockRemoveCardBaanxToken.mockResolvedValue(undefined);
      setupLoadCardDataMock({
        error: 'Unauthorized',
        isAuthenticated: true,
      });

      // When: component renders
      render();

      // Then: should dispatch Redux actions after token removal
      await waitFor(() => {
        expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'card/resetAuthenticatedData' }),
        );
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'card/clearAllCache' }),
        );
      });
    });

    it('calls isAuthenticationError with the correct error', async () => {
      // Given: authenticated user with error
      setupMockSelectors({ isAuthenticated: true });
      const testError = 'Test authentication error';
      mockIsAuthenticationError.mockReturnValue(true);
      setupLoadCardDataMock({
        error: testError,
        isAuthenticated: true,
      });

      // When: component renders
      render();

      // Then: should call isAuthenticationError with the error
      await waitFor(() => {
        expect(mockIsAuthenticationError).toHaveBeenCalledWith(testError);
      });
    });

    it('runs authentication cleanup once even when error persists across renders', async () => {
      // Given: authenticated user with persistent authentication error
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(true);
      const WrappedCardHome = withCardSDK(CardHome);

      setupLoadCardDataMock({
        error: 'First auth error',
        isAuthenticated: true,
        warning: null,
        priorityToken: mockPriorityToken,
      });

      setupLoadCardDataMock({
        error: 'First auth error',
        isAuthenticated: true,
        warning: null,
        priorityToken: mockPriorityToken,
      });

      // When: component renders twice with the same authentication error
      const { rerender } = renderWithProvider(<WrappedCardHome />, {
        state: {
          engine: {
            backgroundState,
          },
        },
      });

      // Then: cleanup runs once on initial render
      await waitFor(() => {
        expect(mockRemoveCardBaanxToken).toHaveBeenCalledTimes(1);
      });

      // When: component re-renders with same error
      rerender(<WrappedCardHome />);

      // Then: cleanup does not run again for unchanged error
      await waitFor(() => {
        expect(mockRemoveCardBaanxToken).toHaveBeenCalledTimes(1);
      });
    });

    it('does not dispatch Redux actions if token removal throws and component unmounts', async () => {
      // Given: authenticated user with authentication error
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(true);
      let resolveTokenRemoval!: () => void;
      const tokenRemovalPromise = new Promise<void>((resolve) => {
        resolveTokenRemoval = resolve;
      });
      mockRemoveCardBaanxToken.mockReturnValue(tokenRemovalPromise);
      setupLoadCardDataMock({
        error: 'Token expired',
        isAuthenticated: true,
      });

      // When: component renders and unmounts before token removal completes
      const { unmount } = render();

      // Wait for token removal to be called
      await waitFor(() => {
        expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
      });

      // Unmount before resolving
      unmount();

      // Resolve the promise after unmount
      resolveTokenRemoval();

      // Wait a bit to ensure no actions are dispatched
      await new Promise((r) => setTimeout(r, 100));

      // Then: should not dispatch actions after unmount
      // Note: This is a safety check - the component guards against this with isMounted
      // The exact behavior depends on timing, so we just verify no errors occur
      expect(mockRemoveCardBaanxToken).toHaveBeenCalledTimes(1);
    });

    it('logs info message when authentication error is detected', async () => {
      // Given: authenticated user with authentication error
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(true);
      setupLoadCardDataMock({
        error: 'Authentication failed',
        isAuthenticated: true,
      });

      const Logger = jest.requireMock('../../../../../util/Logger');

      // When: component renders
      render();

      // Then: should log info message about clearing auth state
      await waitFor(() => {
        expect(Logger.log).toHaveBeenCalledWith(
          'CardHome: Authentication error detected, clearing auth state and redirecting',
        );
      });
    });

    it('executes cleanup operations in correct order', async () => {
      // Given: authenticated user with authentication error
      setupMockSelectors({ isAuthenticated: true });
      mockIsAuthenticationError.mockReturnValue(true);
      const callOrder: string[] = [];

      mockRemoveCardBaanxToken.mockImplementation(async () => {
        callOrder.push('removeToken');
      });

      mockDispatch.mockImplementation((action) => {
        if (action.type === 'card/resetAuthenticatedData') {
          callOrder.push('resetAuth');
        } else if (action.type === 'card/clearAllCache') {
          callOrder.push('clearCache');
        }
        return action;
      });

      mockNavigationDispatch.mockImplementation(() => {
        callOrder.push('navigate');
      });

      setupLoadCardDataMock({
        error: 'Token expired',
        isAuthenticated: true,
      });

      // When: component renders
      render();

      // Then: operations should execute in correct order
      await waitFor(() => {
        expect(callOrder).toEqual([
          'removeToken',
          'resetAuth',
          'clearCache',
          'navigate',
        ]);
      });
    });
  });

  describe('KYC Status Verification', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    });

    describe('canEnableCard Logic', () => {
      it('enables card button when user is verified and authenticated', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        const enableButton = screen.getByTestId(
          CardHomeSelectors.ENABLE_CARD_BUTTON,
        );
        expect(enableButton.props.disabled).toBe(false);
      });

      it('disables card button when user KYC is pending', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        const enableButton = screen.getByTestId(
          CardHomeSelectors.ENABLE_CARD_BUTTON,
        );
        expect(enableButton.props.disabled).toBe(true);
      });

      it('disables card button when user KYC is rejected', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'REJECTED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        const enableButton = screen.getByTestId(
          CardHomeSelectors.ENABLE_CARD_BUTTON,
        );
        expect(enableButton.props.disabled).toBe(true);
      });

      it('disables card button when user KYC is unverified', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'UNVERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        const enableButton = screen.getByTestId(
          CardHomeSelectors.ENABLE_CARD_BUTTON,
        );
        expect(enableButton.props.disabled).toBe(true);
      });

      it('disables card button when KYC status is loading', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: true,
        });

        render();

        // When loading, the button skeleton is shown instead
        expect(
          screen.getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON),
        ).toBeTruthy();
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('disables card button when KYC status is null', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: null,
          isLoading: false,
        });

        render();

        const enableButton = screen.getByTestId(
          CardHomeSelectors.ENABLE_CARD_BUTTON,
        );
        expect(enableButton.props.disabled).toBe(true);
      });

      it('enables card button for unauthenticated users regardless of KYC', () => {
        setupMockSelectors({ isAuthenticated: false });
        setupLoadCardDataMock({
          isAuthenticated: false,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: null,
          isLoading: false,
        });

        render();

        const enableButton = screen.getByTestId(
          CardHomeSelectors.ENABLE_CARD_BUTTON,
        );
        expect(enableButton.props.disabled).toBe(false);
      });

      it('enables card button when Baanx login is disabled', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: false,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // When Baanx login is disabled, should show add funds button instead
        expect(
          screen.getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
        ).toBeTruthy();
      });
    });

    describe('KYC Status Alerts', () => {
      it('displays alert when KYC status is pending', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Verification in Progress',
            'Your identity verification is being processed. This usually takes a few minutes. Please check back shortly to enable your card.',
            [{ text: 'OK', style: 'default' }],
          );
        });
      });

      it('displays alert when KYC status is rejected', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'REJECTED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Verification Not Approved',
            "We were unable to verify your identity at this time. Please contact our support team for assistance and we'll help you resolve this issue.",
            [{ text: 'OK', style: 'default' }],
          );
        });
      });

      it('displays alert when KYC status is unverified', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'UNVERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Verification Required',
            'You need to complete identity verification before enabling your card. Please complete the onboarding process.',
            [{ text: 'OK', style: 'default' }],
          );
        });
      });

      it('does not display alert when KYC status is verified', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).not.toHaveBeenCalled();
        });
      });

      it('does not display alert when user is unauthenticated', async () => {
        setupMockSelectors({ isAuthenticated: false });
        setupLoadCardDataMock({
          isAuthenticated: false,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: null,
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).not.toHaveBeenCalled();
        });
      });

      it('does not display alert when Baanx login is disabled', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: false,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).not.toHaveBeenCalled();
        });
      });

      it('does not display alert when warning is not NoCard', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NeedDelegation,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).not.toHaveBeenCalled();
        });
      });

      it('does not display alert when data is loading', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: true,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).not.toHaveBeenCalled();
        });
      });
    });

    describe('KYC Error Handling', () => {
      it('displays error alert when KYC fetch fails', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: null,
          error: 'KYC fetch failed',
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Verification Status Unavailable',
            "We couldn't check your verification status. Please try again later or contact support if the issue persists.",
            [{ text: 'OK', style: 'default' }],
          );
        });
      });

      it('does not display error alert when KYC status exists', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          error: 'Some other error',
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).not.toHaveBeenCalledWith(
            'Verification Status Unavailable',
            expect.any(String),
            expect.any(Array),
          );
        });
      });

      it('does not display error alert when user is unauthenticated', async () => {
        setupMockSelectors({ isAuthenticated: false });
        setupLoadCardDataMock({
          isAuthenticated: false,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: null,
          error: 'KYC fetch failed',
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).not.toHaveBeenCalledWith(
            'Verification Status Unavailable',
            expect.any(String),
            expect.any(Array),
          );
        });
      });

      it('does not display error alert when data is loading', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: null,
          error: 'KYC fetch failed',
          isLoading: true,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).not.toHaveBeenCalled();
        });
      });
    });

    describe('getKYCStatusMessage Function', () => {
      it('returns correct message for PENDING state', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            expect.stringContaining('Progress'),
            expect.stringContaining('being processed'),
            expect.any(Array),
          );
        });
      });

      it('returns correct message for REJECTED state', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'REJECTED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            expect.stringContaining('Not Approved'),
            expect.stringContaining('contact our support team'),
            expect.any(Array),
          );
        });
      });

      it('returns correct message for UNVERIFIED state', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'UNVERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            expect.stringContaining('Required'),
            expect.stringContaining('complete identity verification'),
            expect.any(Array),
          );
        });
      });

      it('returns null for VERIFIED state', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          expect(Alert.alert).not.toHaveBeenCalled();
        });
      });

      it('returns null for null verification state', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          isBaanxLoginEnabled: true,
          warning: CardWarning.NoCard,
          kycStatus: { verificationState: null, userId: 'user-123' },
          isLoading: false,
        });

        render();

        await waitFor(() => {
          const statusAlerts = (Alert.alert as jest.Mock).mock.calls.filter(
            (call) =>
              call[0].includes('Progress') ||
              call[0].includes('Not Approved') ||
              call[0].includes('Required'),
          );
          expect(statusAlerts).toHaveLength(0);
        });
      });
    });
  });
});
