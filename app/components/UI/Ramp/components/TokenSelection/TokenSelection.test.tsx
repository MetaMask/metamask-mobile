import React from 'react';
import { ActivityIndicator } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TokenSelection from './TokenSelection';
import useSearchTokenResults from '../../Deposit/hooks/useSearchTokenResults';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { MOCK_CRYPTOCURRENCIES } from '../../Deposit/testUtils';
import { UnifiedRampRoutingType } from '../../../../../reducers/fiatOrders/types';
import { useRampTokens } from '../../hooks/useRampTokens';
import { useRampsController } from '../../hooks/useRampsController';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();
const mockParentGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
    dangerouslyGetParent: () => ({
      goBack: mockParentGoBack,
    }),
  }),
}));

interface CustomTestState {
  fiatOrders?: {
    rampRoutingDecision?: UnifiedRampRoutingType;
  };
}

function renderWithProvider(
  component: React.ComponentType,
  customState?: CustomTestState,
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
          detectedGeolocation: 'US',
          rampRoutingDecision: UnifiedRampRoutingType.DEPOSIT,
          ...customState?.fiatOrders,
        },
      },
    },
  );
}

jest.mock('../../Deposit/hooks/useSearchTokenResults', () => jest.fn());

const mockGoToBuy = jest.fn();

jest.mock('../../hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

const mockUseRampsUnifiedV2Enabled = jest.fn();
jest.mock('../../hooks/useRampsUnifiedV2Enabled', () => ({
  __esModule: true,
  default: () => mockUseRampsUnifiedV2Enabled(),
}));

jest.mock('../../hooks/useRampTokens', () => ({
  useRampTokens: jest.fn(),
}));

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: jest.fn(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

const mockGetNetworkName = jest.fn();
jest.mock('../../Deposit/hooks/useDepositCryptoCurrencyNetworkName', () => ({
  useDepositCryptoCurrencyNetworkName: () => mockGetNetworkName,
}));

const mockNetworkConfigurations = {
  'eip155:1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [],
  },
  'bip122:000000000019d6689c085ae165831e93': {
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    name: 'Bitcoin',
    nativeCurrency: 'BTC',
    rpcEndpoints: [],
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    nativeCurrency: 'SOL',
    rpcEndpoints: [],
  },
};

jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectNetworkConfigurationsByCaipChainId: () => mockNetworkConfigurations,
}));

const mockTokens = MOCK_CRYPTOCURRENCIES;
const mockUseRampTokens = useRampTokens as jest.MockedFunction<
  typeof useRampTokens
>;
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
    (useSearchTokenResults as jest.Mock).mockReturnValue(mockTokens);
    mockGetNetworkName.mockReturnValue('Ethereum Mainnet');
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false); // Default to V1 behavior

    const rampsTokens = convertToRampsTokens(mockTokens);

    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);

    mockUseRampTokens.mockReturnValue({
      topTokens: rampsTokens,
      allTokens: rampsTokens,
      isLoading: false,
      error: null,
    });

    mockUseRampsController.mockReturnValue({
      tokens: {
        topTokens: rampsTokens,
        allTokens: rampsTokens,
      },
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      userRegionLoading: false,
      userRegionError: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly and matches snapshot (legacy)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    const { toJSON } = renderWithProvider(TokenSelection);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly and matches snapshot (V2 enabled)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    const { toJSON } = renderWithProvider(TokenSelection);

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays empty state when no tokens match search', async () => {
    (useSearchTokenResults as jest.Mock).mockReturnValue([]);
    const { getByPlaceholderText, getByText, toJSON } =
      renderWithProvider(TokenSelection);

    const searchInput = getByPlaceholderText('Search token by name or address');
    fireEvent.changeText(searchInput, 'Nonexistent Token');

    await waitFor(() => {
      expect(getByText('No tokens match "Nonexistent Token"')).toBeTruthy();
    });
    expect(toJSON()).toMatchSnapshot();
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

  it('calls goToBuy and closes modal when token is pressed (V1 flow)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    const { getByTestId } = renderWithProvider(TokenSelection);

    const firstToken = getByTestId(`token-list-item-${mockTokens[0].assetId}`);
    fireEvent.press(firstToken);

    expect(mockParentGoBack).toHaveBeenCalled();
    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: mockTokens[0].assetId,
    });
  });

  it('calls goToBuy without closing modal when token is pressed (V2 flow)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    const { getByTestId } = renderWithProvider(TokenSelection);

    const firstToken = getByTestId(`token-list-item-${mockTokens[0].assetId}`);
    fireEvent.press(firstToken);

    expect(mockParentGoBack).not.toHaveBeenCalled();
    expect(mockGoToBuy).toHaveBeenCalledWith({
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

  it('displays loading indicator while fetching tokens (legacy)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    mockUseRampTokens.mockReturnValue({
      topTokens: null,
      allTokens: null,
      isLoading: true,
      error: null,
    });

    const { UNSAFE_getByType } = renderWithProvider(TokenSelection);
    const activityIndicator = UNSAFE_getByType(ActivityIndicator);

    expect(activityIndicator).toBeDefined();
  });

  it('displays loading indicator while fetching tokens (V2 enabled)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    mockUseRampsController.mockReturnValue({
      tokens: null,
      tokensLoading: true,
      tokensError: null,
      userRegion: null,
      userRegionLoading: false,
      userRegionError: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
    });

    const { UNSAFE_getByType } = renderWithProvider(TokenSelection);
    const activityIndicator = UNSAFE_getByType(ActivityIndicator);

    expect(activityIndicator).toBeDefined();
  });

  it('displays error message when token fetch fails (legacy)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    mockUseRampTokens.mockReturnValue({
      topTokens: null,
      allTokens: null,
      isLoading: false,
      error: new Error('Network error'),
    });

    const { getByText } = renderWithProvider(TokenSelection);

    expect(getByText(/unable to load tokens/i)).toBeOnTheScreen();
  });

  it('displays error message when token fetch fails (V2 enabled)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    mockUseRampsController.mockReturnValue({
      tokens: null,
      tokensLoading: false,
      tokensError: 'Network error',
      userRegion: null,
      userRegionLoading: false,
      userRegionError: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
    });

    const { getByText } = renderWithProvider(TokenSelection);

    expect(getByText(/unable to load tokens/i)).toBeOnTheScreen();
  });

  it('uses topTokens when search string is empty (legacy)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);

    mockUseRampTokens.mockReturnValue({
      topTokens,
      allTokens,
      isLoading: false,
      error: null,
    });

    renderWithProvider(TokenSelection);

    expect(useSearchTokenResults).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: topTokens,
      }),
    );
  });

  it('uses topTokens when search string is empty (V2 enabled)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);

    mockUseRampsController.mockReturnValue({
      tokens: {
        topTokens,
        allTokens,
      },
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      userRegionLoading: false,
      userRegionError: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
    });

    renderWithProvider(TokenSelection);

    expect(useSearchTokenResults).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: topTokens,
      }),
    );
  });

  it('uses allTokens when user is searching (legacy)', async () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);

    mockUseRampTokens.mockReturnValue({
      topTokens,
      allTokens,
      isLoading: false,
      error: null,
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

  it('uses allTokens when user is searching (V2 enabled)', async () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);

    mockUseRampsController.mockReturnValue({
      tokens: {
        topTokens,
        allTokens,
      },
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      userRegionLoading: false,
      userRegionError: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
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

  it('uses topTokens when search string contains only whitespace (legacy)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);

    mockUseRampTokens.mockReturnValue({
      topTokens,
      allTokens,
      isLoading: false,
      error: null,
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

  it('uses topTokens when search string contains only whitespace (V2 enabled)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);

    mockUseRampsController.mockReturnValue({
      tokens: {
        topTokens,
        allTokens,
      },
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      userRegionLoading: false,
      userRegionError: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
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

  it('tracks RAMPS_TOKEN_SELECTED event when token is selected', () => {
    const { getByTestId } = renderWithProvider(TokenSelection);

    const firstToken = getByTestId(`token-list-item-${mockTokens[0].assetId}`);
    fireEvent.press(firstToken);

    expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_TOKEN_SELECTED', {
      ramp_type: 'UNIFIED BUY',
      region: 'US',
      chain_id: mockTokens[0].chainId,
      currency_destination: mockTokens[0].assetId,
      currency_destination_symbol: mockTokens[0].symbol,
      currency_destination_network: 'Ethereum Mainnet',
      currency_source: '',
      is_authenticated: false,
      token_caip19: mockTokens[0].assetId,
      token_symbol: mockTokens[0].symbol,
      ramp_routing: UnifiedRampRoutingType.DEPOSIT,
    });
  });

  it('filters tokens to only include those for configured networks (V2 enabled)', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);

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
      tokensLoading: false,
      tokensError: null,
      userRegion: null,
      userRegionLoading: false,
      userRegionError: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: jest.fn(),
      selectedProvider: null,
      setSelectedProvider: jest.fn(),
      providers: [],
      providersLoading: false,
      providersError: null,
      countries: [],
      countriesLoading: false,
      countriesError: null,
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
