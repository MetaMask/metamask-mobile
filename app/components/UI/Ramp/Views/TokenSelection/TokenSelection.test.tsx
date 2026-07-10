import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TokenSelection from './TokenSelection';
import { TokenSelectionSelectors } from './TokenSelection.testIds';
import useSearchTokenResults from '../../hooks/useSearchTokenResults';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  MOCK_CRYPTOCURRENCIES,
  MOCK_ETH_TOKEN,
  MOCK_BTC_TOKEN,
  MOCK_USDC_SOLANA_TOKEN,
} from '../../testUtils/mockCryptoCurrencies';
import { useRampTokens } from '../../hooks/useRampTokens';
import { useRampsController } from '../../hooks/useRampsController';
import useRampsUnifiedV2Enabled from '../../hooks/useRampsUnifiedV2Enabled';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockHeaderGoBack = jest.fn();
const mockParentGoBack = jest.fn();
const mockRootNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockHeaderGoBack,
    getParent: () => ({
      goBack: mockParentGoBack,
      getParent: () => ({
        navigate: mockRootNavigate,
      }),
    }),
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
    }),
  }),
}));

interface CustomTestState {
  fiatOrders?: Record<string, unknown>;
}

function renderWithProvider(
  component: React.ComponentType,
  customState?: CustomTestState,
  initialParams?: Record<string, unknown>,
) {
  return renderScreen(
    component,
    {
      name: 'TokenSelection',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
        fiatOrders: {
          ...customState?.fiatOrders,
        },
      },
    },
    initialParams,
  );
}

jest.mock('../../hooks/useSearchTokenResults', () => jest.fn());

const mockGoToBuy = jest.fn();

jest.mock('../../hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: jest.fn(),
}));

jest.mock('../../hooks/useRampsUnifiedV2Enabled', () => jest.fn());

jest.mock('../../hooks/useRampTokens', () => ({
  useRampTokens: jest.fn(),
}));

const mockUseRampsUnifiedV2Enabled =
  useRampsUnifiedV2Enabled as jest.MockedFunction<
    typeof useRampsUnifiedV2Enabled
  >;

const mockUseRampTokens = useRampTokens as jest.MockedFunction<
  typeof useRampTokens
>;

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

const mockGetNetworkName = jest.fn();
jest.mock('../../hooks/useDepositCryptoCurrencyNetworkName', () => ({
  useDepositCryptoCurrencyNetworkName: () => mockGetNetworkName,
}));

const mockNetworkConfigurations = {
  'eip155:1': {
    chainId: '0x1',
    caipChainId: 'eip155:1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [],
  },
  'bip122:000000000019d6689c085ae165831e93': {
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    caipChainId: 'bip122:000000000019d6689c085ae165831e93',
    name: 'Bitcoin',
    nativeCurrency: 'BTC',
    rpcEndpoints: [],
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    nativeCurrency: 'SOL',
    rpcEndpoints: [],
  },
};

jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectNetworkConfigurationsByCaipChainId: () => mockNetworkConfigurations,
}));

const mockGetAddressesByGroupId = jest.fn();
jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../../selectors/multichainAccounts/accounts'),
  selectInternalAccountListSpreadByScopesByGroupId: () =>
    mockGetAddressesByGroupId,
}));

const mockTokens = MOCK_CRYPTOCURRENCIES;
const mockUseRampsController = useRampsController as jest.MockedFunction<
  typeof useRampsController
>;

// Convert MockDepositCryptoCurrency to RampsToken format
const convertToRampsTokens = (tokens: typeof mockTokens) =>
  tokens.map((token) => ({
    ...token,
    tokenSupported: !token.unsupported,
  }));

describe('TokenSelection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Return tokens with tokenSupported set so that items are not disabled.
    // In React 19, fireEvent.press does not fire on disabled TouchableOpacity
    // elements; without tokenSupported the isDisabled prop becomes true and
    // press events are silently dropped.
    (useSearchTokenResults as jest.Mock).mockReturnValue(
      convertToRampsTokens(mockTokens),
    );
    mockGetNetworkName.mockReturnValue('Ethereum Mainnet');
    mockGetAddressesByGroupId.mockReturnValue([]);
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false); // Default to V1 behavior

    const rampsTokens = convertToRampsTokens(mockTokens);

    mockUseRampsController.mockReturnValue({
      tokens: {
        topTokens: rampsTokens,
        allTokens: rampsTokens,
      },
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders token list', () => {
    const { getByPlaceholderText } = renderWithProvider(TokenSelection);

    expect(
      getByPlaceholderText('Search token by name or address'),
    ).toBeOnTheScreen();
  });

  it('calls navigation.goBack when header back is pressed ', () => {
    const { getByTestId } = renderWithProvider(TokenSelection);

    fireEvent.press(getByTestId('deposit-back-navbar-button'));

    expect(mockHeaderGoBack).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('calls navigation.goBack when header back is pressed while tokens are loading', () => {
    mockUseRampsController.mockReturnValue({
      tokens: null,
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: true,
      tokensError: null,
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(TokenSelection);

    fireEvent.press(getByTestId('deposit-back-navbar-button'));

    expect(mockHeaderGoBack).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('displays empty state when no tokens match search', async () => {
    (useSearchTokenResults as jest.Mock).mockReturnValue([]);
    const { getByPlaceholderText, getByText } =
      renderWithProvider(TokenSelection);

    const searchInput = getByPlaceholderText('Search token by name or address');
    fireEvent.changeText(searchInput, 'Nonexistent Token');

    await waitFor(() => {
      expect(
        getByText('No tokens match "Nonexistent Token"'),
      ).toBeOnTheScreen();
    });
  });

  it('filters tokens by search string', async () => {
    const { getByPlaceholderText } = renderWithProvider(TokenSelection);

    const searchInput = getByPlaceholderText('Search token by name or address');
    fireEvent.changeText(searchInput, 'USDC');

    await waitFor(() => {
      expect(useSearchTokenResults).toHaveBeenCalledWith(
        expect.objectContaining({
          searchString: 'USDC',
        }),
      );
    });
  });

  it('sets selected token and navigates directly to AMOUNT_INPUT without closing modal when token is pressed ', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    const mockSetSelectedToken = jest.fn();
    mockUseRampsController.mockReturnValue({
      ...mockUseRampsController(),
      setSelectedToken: mockSetSelectedToken,
    });
    const { getByTestId } = renderWithProvider(TokenSelection);

    const firstToken = getByTestId(`token-list-item-${mockTokens[0].assetId}`);
    fireEvent.press(firstToken);

    expect(mockParentGoBack).not.toHaveBeenCalled();
    expect(mockGoToBuy).not.toHaveBeenCalled();
    expect(mockSetSelectedToken).toHaveBeenCalledWith(mockTokens[0].assetId);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.AMOUNT_INPUT, {
      assetId: mockTokens[0].assetId,
    });
  });

  it('navigates to unsupported token modal when info button is pressed', () => {
    const { getAllByTestId } = renderWithProvider(TokenSelection);

    const infoButtons = getAllByTestId('token-unsupported-info-button');
    fireEvent.press(infoButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('RampModals', {
      screen: 'RampUnsupportedTokenModal',
    });
  });

  it('displays loading indicator while fetching tokens', () => {
    mockUseRampsController.mockReturnValue({
      tokens: null,
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: true,
      tokensError: null,
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(TokenSelection);

    expect(
      getByTestId(TokenSelectionSelectors.LOADING_INDICATOR),
    ).toBeOnTheScreen();
  });

  it('displays loading when tokens not yet loaded when tokens are not yet loaded', () => {
    mockUseRampsController.mockReturnValue({
      tokens: null,
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(TokenSelection);

    expect(
      getByTestId(TokenSelectionSelectors.LOADING_INDICATOR),
    ).toBeOnTheScreen();
  });

  it('displays error message when token fetch fails', () => {
    mockUseRampsController.mockReturnValue({
      tokens: null,
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: false,
      tokensError: 'Network error',
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    const { getByText } = renderWithProvider(TokenSelection);

    expect(getByText(/unable to load tokens/i)).toBeOnTheScreen();
  });

  it('uses topTokens when search string is empty', () => {
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);

    mockUseRampsController.mockReturnValue({
      tokens: {
        topTokens,
        allTokens,
      },
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    renderWithProvider(TokenSelection);

    expect(useSearchTokenResults).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: topTokens,
      }),
    );
  });

  it('uses allTokens when user is searching', async () => {
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);

    mockUseRampsController.mockReturnValue({
      tokens: {
        topTokens,
        allTokens,
      },
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    const { getByPlaceholderText } = renderWithProvider(TokenSelection);

    const searchInput = getByPlaceholderText('Search token by name or address');
    fireEvent.changeText(searchInput, 'USDC');

    await waitFor(() => {
      expect(useSearchTokenResults).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: allTokens,
          searchString: 'USDC',
        }),
      );
    });
  });

  it('uses topTokens when search string contains only whitespace', () => {
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);

    mockUseRampsController.mockReturnValue({
      tokens: {
        topTokens,
        allTokens,
      },
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    const { getByPlaceholderText } = renderWithProvider(TokenSelection);

    const searchInput = getByPlaceholderText('Search token by name or address');
    fireEvent.changeText(searchInput, '   ');

    expect(useSearchTokenResults).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: topTokens,
        searchString: '   ',
      }),
    );
  });

  it('filters tokens to only include those for configured networks', () => {
    const allTokensWithUnconfiguredNetwork = convertToRampsTokens([
      ...mockTokens,
      {
        ...mockTokens[0],
        assetId: 'eip155:999/erc20:0x123',
        chainId: 'eip155:999',
        symbol: 'UNCONFIGURED',
      },
    ]);

    mockUseRampsController.mockReturnValue({
      tokens: {
        topTokens: allTokensWithUnconfiguredNetwork,
        allTokens: allTokensWithUnconfiguredNetwork,
      },
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });

    renderWithProvider(TokenSelection);

    expect(useSearchTokenResults).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.arrayContaining(
          convertToRampsTokens(mockTokens).map((token) =>
            expect.objectContaining({
              chainId: token.chainId,
            }),
          ),
        ),
      }),
    );

    const tokensPassedToSearch = (useSearchTokenResults as jest.Mock).mock
      .calls[0][0].tokens;
    const unconfiguredToken = tokensPassedToSearch.find(
      (token: (typeof mockTokens)[0]) => token.chainId === 'eip155:999',
    );
    expect(unconfiguredToken).toBeUndefined();
  });
});

describe('TokenSelection Component - receive mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchTokenResults as jest.Mock).mockImplementation(
      ({ tokens }) => tokens,
    );
    mockGetNetworkName.mockReturnValue('Ethereum Mainnet');
    mockGetAddressesByGroupId.mockReturnValue([]);
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);

    const rampsTokens = convertToRampsTokens(mockTokens);
    mockUseRampTokens.mockReturnValue({
      topTokens: rampsTokens,
      allTokens: rampsTokens,
      isLoading: false,
      error: null,
    });

    mockUseRampsController.mockReturnValue({
      tokens: { topTokens: rampsTokens, allTokens: rampsTokens },
      selectedToken: null,
      setSelectedToken: jest.fn(),
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
      paymentMethods: [],
      selectedPaymentMethod: null,
      setSelectedPaymentMethod: jest.fn(),
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      paymentMethodsFetching: false,
      paymentMethodsStatus: 'idle' as const,
      getQuotes: jest.fn(),
      getBuyWidgetData: jest.fn(),
      orders: [],
      getOrderById: jest.fn(),
      addOrder: jest.fn(),
      addPrecreatedOrder: jest.fn(),
      removeOrder: jest.fn(),
      refreshOrder: jest.fn(),
      getOrderFromCallback: jest.fn(),
    });
  });

  it('filters out non-EVM tokens when receiveMode is enabled', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      TokenSelection,
      undefined,
      { receiveMode: true, groupId: 'test-group-id' },
    );

    expect(
      getByTestId(`token-list-item-${MOCK_ETH_TOKEN.assetId}`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`token-list-item-${MOCK_BTC_TOKEN.assetId}`),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(`token-list-item-${MOCK_USDC_SOLANA_TOKEN.assetId}`),
    ).not.toBeOnTheScreen();
  });

  it('navigates to the receive QR screen with the matching address for the selected chain', () => {
    mockGetAddressesByGroupId.mockReturnValue([
      {
        account: { address: '0xabc' },
        scope: 'eip155:1',
        networkName: 'Ethereum Mainnet',
      },
    ]);

    const { getByTestId } = renderWithProvider(TokenSelection, undefined, {
      receiveMode: true,
      groupId: 'test-group-id',
    });

    fireEvent.press(getByTestId(`token-list-item-${MOCK_ETH_TOKEN.assetId}`));

    expect(mockGetAddressesByGroupId).toHaveBeenCalledWith('test-group-id');
    expect(mockRootNavigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.RECEIVE_QR,
      {
        tokenSymbol: MOCK_ETH_TOKEN.symbol,
        networkName: 'Ethereum Mainnet',
        chainId: MOCK_ETH_TOKEN.chainId,
        address: '0xabc',
      },
    );
    expect(mockGoToBuy).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.RAMP.AMOUNT_INPUT,
      expect.anything(),
    );
  });

  it('falls back to any EVM address when the exact chain scope is not available', () => {
    mockGetAddressesByGroupId.mockReturnValue([
      {
        account: { address: '0xfallback' },
        scope: 'eip155:137',
        networkName: 'Polygon',
      },
    ]);

    const { getByTestId } = renderWithProvider(TokenSelection, undefined, {
      receiveMode: true,
      groupId: 'test-group-id',
    });

    fireEvent.press(getByTestId(`token-list-item-${MOCK_ETH_TOKEN.assetId}`));

    expect(mockRootNavigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.RECEIVE_QR,
      {
        tokenSymbol: MOCK_ETH_TOKEN.symbol,
        networkName: 'Polygon',
        chainId: MOCK_ETH_TOKEN.chainId,
        address: '0xfallback',
      },
    );
  });

  it('does not navigate to the receive QR screen when no address is found', () => {
    mockGetAddressesByGroupId.mockReturnValue([]);

    const { getByTestId } = renderWithProvider(TokenSelection, undefined, {
      receiveMode: true,
      groupId: 'test-group-id',
    });

    fireEvent.press(getByTestId(`token-list-item-${MOCK_ETH_TOKEN.assetId}`));

    expect(mockRootNavigate).not.toHaveBeenCalled();
  });
});
