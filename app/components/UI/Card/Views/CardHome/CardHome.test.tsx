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
  get supportedTokens() {
    return [];
  },
  isCardHolder: jest.fn(),
  getGeoLocation: jest.fn(),
  getSupportedTokensAllowances: jest.fn(),
  getPriorityToken: jest.fn(),
  initiateCardProviderAuthentication: jest.fn(),
  login: jest.fn(),
  authorize: jest.fn(),
  exchangeToken: jest.fn(),
  refreshLocalToken: jest.fn(),
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
import { useSelector } from 'react-redux';
import React from 'react';
import CardHome from './CardHome';
import { cardDefaultNavigationOptions } from '../../routes';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { withCardSDK } from '../../sdk';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
import { AllowanceState } from '../../types';
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useIsCardholder } from '../../hooks/useIsCardholder';
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

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

import { useFocusEffect } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useFocusEffect: jest.fn(),
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions,
    }),
  };
});

const mockPriorityToken = {
  address: '0x123...',
  symbol: 'USDC',
  decimals: 6,
  balance: '1000000000',
  allowance: '500000000',
  name: 'USD Coin',
  chainId: 1,
  allowanceState: AllowanceState.Enabled,
};

const mockCurrentAddress = '0x789';

const mockSelectedInternalAccount = {
  address: mockCurrentAddress,
};

// Mock hooks
const mockFetchPriorityToken = jest.fn().mockResolvedValue(mockPriorityToken);
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

interface MockAssetBalanceReturn {
  balanceFiat: string | undefined;
  asset: { symbol: string; image: string };
  mainBalance: string | undefined;
  secondaryBalance: string | undefined;
  rawTokenBalance?: number;
  rawFiatNumber?: number;
}

const mockUseAssetBalance = jest.fn<MockAssetBalanceReturn, []>(() => ({
  balanceFiat: '$1,000.00',
  asset: {
    symbol: 'USDC',
    image: 'usdc-image-url',
  },
  mainBalance: '$1,000.00',
  secondaryBalance: '1000 USDC',
  rawTokenBalance: 1000,
  rawFiatNumber: 1000,
}));

const mockUseNavigateToCardPage = jest.fn(() => ({
  navigateToCardPage: mockNavigateToCardPage,
}));

const mockUseSwapBridgeNavigation = jest.fn(() => ({
  goToSwaps: mockGoToSwaps,
}));

jest.mock('../../hooks/useGetPriorityCardToken', () => ({
  useGetPriorityCardToken: jest.fn(),
}));

jest.mock('../../hooks/useAssetBalance', () => ({
  useAssetBalance: () => mockUseAssetBalance(),
}));

jest.mock('../../hooks/useNavigateToCardPage', () => ({
  useNavigateToCardPage: () => mockUseNavigateToCardPage(),
}));

jest.mock('../../hooks/useIsCardholder', () => ({
  useIsCardholder: jest.fn(),
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

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_ADD_FUNDS_CLICKED: 'card_add_funds_clicked',
    CARD_HOME_VIEWED: 'card_home_viewed',
  },
}));

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

// Mock Linea chain ID constant
jest.mock('@metamask/swaps-controller/dist/constants', () => ({
  LINEA_CHAIN_ID: '0xe708',
}));

// Mock utility functions
jest.mock('../../util/getHighestFiatToken', () => ({
  getHighestFiatToken: jest.fn(() => mockPriorityToken),
}));

// Mock Logger
jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
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

    // Clear SDK mocks
    mockLogoutFromProvider.mockClear();
    mockSetIsAuthenticated.mockClear();

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

    // Setup hook mocks with default values
    (useGetPriorityCardToken as jest.Mock).mockReturnValue({
      priorityToken: mockPriorityToken,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: null,
    });

    mockUseAssetBalance.mockReturnValue({
      balanceFiat: '$1,000.00',
      asset: {
        symbol: 'USDC',
        image: 'usdc-image-url',
      },
      mainBalance: '$1,000.00',
      secondaryBalance: '1000 USDC',
      rawTokenBalance: 1000,
      rawFiatNumber: 1000,
    });

    mockUseNavigateToCardPage.mockReturnValue({
      navigateToCardPage: mockNavigateToCardPage,
    });

    mockUseSwapBridgeNavigation.mockReturnValue({
      goToSwaps: mockGoToSwaps,
    });

    (useOpenSwaps as jest.Mock).mockReturnValue({
      openSwaps: mockOpenSwaps,
    });

    (useIsCardholder as jest.Mock).mockReturnValue(true);

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);

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

  it('opens AddFundsBottomSheet when add funds button is pressed with USDC token', async () => {
    // Given: priority token is USDC (default)
    // When: user presses add funds button
    render();

    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should open bottom sheet, not swaps
    await waitFor(() => {
      expect(screen.getByTestId('add-funds-bottom-sheet')).toBeTruthy();
    });

    expect(mockOpenSwaps).not.toHaveBeenCalled();
  });

  it('opens AddFundsBottomSheet when add funds button is pressed with USDT token', async () => {
    // Given: priority token is USDT
    const usdtToken = {
      ...mockPriorityToken,
      symbol: 'USDT',
    };

    (useGetPriorityCardToken as jest.Mock).mockReturnValueOnce({
      priorityToken: usdtToken,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: null,
    });

    // When: user presses add funds button
    render();

    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should open bottom sheet for supported token
    await waitFor(() => {
      expect(screen.getByTestId('add-funds-bottom-sheet')).toBeTruthy();
    });

    expect(mockOpenSwaps).not.toHaveBeenCalled();
  });

  it('calls goToSwaps when add funds button is pressed with non-supported token', async () => {
    // Given: priority token is ETH (not supported for deposit)
    const ethToken = {
      ...mockPriorityToken,
      symbol: 'ETH',
    };

    (useGetPriorityCardToken as jest.Mock).mockReturnValueOnce({
      priorityToken: ethToken,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: null,
    });

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
      expect(mockOpenSwaps).toHaveBeenCalledWith({
        chainId: '0xe708',
      });
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

    // Then: should show token and balance information
    expect(screen.getByText('USDC')).toBeTruthy();
    expect(screen.getByTestId('balance-test-id')).toBeTruthy();
    expect(screen.getByTestId('secondary-balance-test-id')).toBeTruthy();
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
    (useGetPriorityCardToken as jest.Mock).mockReturnValueOnce({
      priorityToken: null,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: 'Failed to fetch token',
    });

    // When: component renders
    render();

    // Then: should show error state
    expect(screen.getByText('Unable to load card')).toBeTruthy();
    expect(screen.getByText('Please try again later')).toBeTruthy();
    expect(screen.getByTestId(CardHomeSelectors.TRY_AGAIN_BUTTON)).toBeTruthy();
  });

  it('calls fetchPriorityToken when try again button is pressed', async () => {
    // Given: error state is displayed
    (useGetPriorityCardToken as jest.Mock).mockReturnValueOnce({
      priorityToken: null,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: 'Failed to fetch token',
    });

    render();

    // When: user presses try again button
    const tryAgainButton = screen.getByTestId(
      CardHomeSelectors.TRY_AGAIN_BUTTON,
    );
    fireEvent.press(tryAgainButton);

    // Then: should retry fetching priority token
    await waitFor(() => {
      expect(mockFetchPriorityToken).toHaveBeenCalled();
    });
  });

  it('displays limited allowance warning when allowance state is limited', () => {
    // Given: priority token has limited allowance
    const limitedAllowanceToken = {
      ...mockPriorityToken,
      allowanceState: AllowanceState.Limited,
    };

    (useGetPriorityCardToken as jest.Mock).mockReturnValueOnce({
      priorityToken: limitedAllowanceToken,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: null,
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

    (useGetPriorityCardToken as jest.Mock).mockReturnValueOnce({
      priorityToken: ethToken,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: null,
    });

    render();
    mockOpenSwaps.mockClear();
    mockTrackEvent.mockClear();

    // When: user presses add funds button
    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should navigate to swaps with correct chain
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockOpenSwaps).toHaveBeenCalledWith({
        chainId: '0xe708',
      });
    });
  });

  it('falls back to mainBalance when balanceFiat is TOKEN_RATE_UNDEFINED', () => {
    // Given: fiat rate is undefined
    mockUseAssetBalance.mockReturnValue({
      balanceFiat: TOKEN_RATE_UNDEFINED,
      asset: {
        symbol: 'USDC',
        image: 'usdc-image-url',
      },
      mainBalance: '1000 USDC',
      secondaryBalance: 'Unable to find conversion rate',
      rawTokenBalance: 1000,
      rawFiatNumber: 0,
    });

    // When: component renders
    render();

    // Then: should display main balance instead of fiat
    expect(screen.getByTestId('balance-test-id')).toHaveTextContent(
      '1000 USDC',
    );
  });

  it('falls back to mainBalance when balanceFiat is not available', () => {
    // Given: fiat balance is empty
    mockUseAssetBalance.mockReturnValue({
      balanceFiat: '',
      asset: {
        symbol: 'USDC',
        image: 'usdc-image-url',
      },
      mainBalance: '1000 USDC',
      secondaryBalance: 'Unable to find conversion rate',
      rawTokenBalance: 1000,
      rawFiatNumber: 0,
    });

    // When: component renders
    render();

    // Then: should display main balance as fallback
    expect(screen.getByTestId('balance-test-id')).toHaveTextContent(
      '1000 USDC',
    );
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
    mockUseAssetBalance.mockReturnValueOnce({
      balanceFiat: '$0.00',
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: '0 USDC',
      secondaryBalance: '$0.00',
      rawTokenBalance: 0,
      rawFiatNumber: 0,
    });

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
    // Given: only main balance is valid (fiat undefined)
    mockUseAssetBalance.mockReturnValueOnce({
      balanceFiat: undefined as unknown as string,
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: '1000 USDC',
      secondaryBalance: '1000 USDC',
      rawTokenBalance: 1000,
      // rawFiatNumber intentionally omitted (undefined)
    });

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

  it('includes only rawFiatNumber when main balance is undefined', async () => {
    // Given: only fiat balance is valid (main undefined)
    mockUseAssetBalance.mockReturnValueOnce({
      balanceFiat: '$1,000.00',
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: undefined as unknown as string,
      secondaryBalance: '$1,000.00',
      // rawTokenBalance omitted
      rawFiatNumber: 1000,
    });

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

  it('fires CARD_HOME_VIEWED once when only mainBalance is valid', async () => {
    // Given: only main balance is available
    mockUseAssetBalance.mockReturnValue({
      balanceFiat: undefined as unknown as string,
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: '1000 USDC',
      secondaryBalance: '1000 USDC',
      rawTokenBalance: 1000,
      // rawFiatNumber omitted
    });

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
    mockUseAssetBalance.mockReturnValue({
      balanceFiat: '$1,000.00',
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: undefined as unknown as string,
      secondaryBalance: '$1,000.00',
      // rawTokenBalance omitted
      rawFiatNumber: 1000,
    });

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
    mockUseAssetBalance.mockReturnValue({
      balanceFiat: 'tokenBalanceLoading',
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: 'TOKENBALANCELOADING',
      secondaryBalance: 'loading',
      // raw values omitted
    });

    // When: component renders
    render();

    // Then: should not fire metrics while loading
    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not fire metrics when balances are unavailable', async () => {
    // Given: fiat is undefined and main is also undefined
    mockUseAssetBalance.mockReturnValue({
      balanceFiat: 'tokenRateUndefined',
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: undefined as unknown as string,
      secondaryBalance: 'n/a',
      // raw values omitted
    });

    // When: component renders
    render();

    // Then: should not fire metrics without valid balance
    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('converts NaN rawTokenBalance to 0 in metrics', async () => {
    // Given: rawTokenBalance is NaN
    mockUseAssetBalance.mockReturnValueOnce({
      balanceFiat: '$1,000.00',
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: '1000 USDC',
      secondaryBalance: '1000 USDC',
      rawTokenBalance: NaN,
      rawFiatNumber: 1000,
    });

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
    mockUseAssetBalance.mockReturnValueOnce({
      balanceFiat: '$1,000.00',
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: '1000 USDC',
      secondaryBalance: '1000 USDC',
      rawTokenBalance: 1000,
      rawFiatNumber: NaN,
    });

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
    mockUseAssetBalance.mockReturnValueOnce({
      balanceFiat: '$1,000.00',
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: '1000 USDC',
      secondaryBalance: '1000 USDC',
      rawTokenBalance: NaN,
      rawFiatNumber: NaN,
    });

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
    mockUseAssetBalance.mockReturnValueOnce({
      balanceFiat: '$1,000.00',
      asset: { symbol: 'USDC', image: 'usdc-image-url' },
      mainBalance: '1000 USDC',
      secondaryBalance: '1000 USDC',
      // rawTokenBalance and rawFiatNumber intentionally omitted (undefined)
    });

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
});
