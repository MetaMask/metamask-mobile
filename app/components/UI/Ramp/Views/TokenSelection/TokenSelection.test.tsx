import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TokenSelection from './TokenSelection';
import { TokenSelectionSelectors } from './TokenSelection.testIds';
import useSearchTokenResults from '../../Deposit/hooks/useSearchTokenResults';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { MOCK_CRYPTOCURRENCIES } from '../../Deposit/testUtils';
import { UnifiedRampRoutingType } from '../../../../../reducers/fiatOrders/types';
import { useRampsController } from '../../hooks/useRampsController';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockHeaderGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockHeaderGoBack,
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

jest.mock('../../Deposit/hooks/useSearchTokenResults', () => jest.fn());
jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: jest.fn(),
}));
jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

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
const mockUseRampsController = useRampsController as jest.MockedFunction<
  typeof useRampsController
>;

const convertToRampsTokens = (tokens: typeof mockTokens) =>
  tokens.map((token) => ({
    ...token,
    tokenSupported: !token.unsupported,
  }));

function renderWithProvider(component: React.ComponentType) {
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
          rampRoutingDecision: UnifiedRampRoutingType.DEPOSIT,
        },
      },
    },
  );
}

const createRampsControllerValue = (
  overrides: Partial<ReturnType<typeof useRampsController>> = {},
): ReturnType<typeof useRampsController> => {
  const rampsTokens = convertToRampsTokens(mockTokens);

  return {
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
    paymentMethodsStatus: 'idle',
    getQuotes: jest.fn(),
    getBuyWidgetData: jest.fn(),
    orders: [],
    getOrderById: jest.fn(),
    addOrder: jest.fn(),
    addPrecreatedOrder: jest.fn(),
    removeOrder: jest.fn(),
    refreshOrder: jest.fn(),
    getOrderFromCallback: jest.fn(),
    ...overrides,
  };
};

describe('TokenSelection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchTokenResults as jest.Mock).mockReturnValue(
      convertToRampsTokens(mockTokens),
    );
    mockGetNetworkName.mockReturnValue('Ethereum Mainnet');
    mockUseRampsController.mockReturnValue(createRampsControllerValue());
  });

  it('renders token list', () => {
    const { getByPlaceholderText } = renderWithProvider(TokenSelection);

    expect(
      getByPlaceholderText('Search token by name or address'),
    ).toBeOnTheScreen();
  });

  it('calls navigation.goBack when header back is pressed', () => {
    const { getByTestId } = renderWithProvider(TokenSelection);

    fireEvent.press(getByTestId('deposit-back-navbar-button'));

    expect(mockHeaderGoBack).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('sets selected token and navigates directly to AMOUNT_INPUT when token is pressed', () => {
    const mockSetSelectedToken = jest.fn();
    mockUseRampsController.mockReturnValue(
      createRampsControllerValue({ setSelectedToken: mockSetSelectedToken }),
    );
    const { getByTestId } = renderWithProvider(TokenSelection);

    const firstToken = getByTestId(`token-list-item-${mockTokens[0].assetId}`);
    fireEvent.press(firstToken);

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
    mockUseRampsController.mockReturnValue(
      createRampsControllerValue({
        tokens: null,
        tokensLoading: true,
        tokensError: null,
      }),
    );

    const { getByTestId } = renderWithProvider(TokenSelection);

    expect(
      getByTestId(TokenSelectionSelectors.LOADING_INDICATOR),
    ).toBeOnTheScreen();
  });

  it('displays loading when tokens are not yet loaded', () => {
    mockUseRampsController.mockReturnValue(
      createRampsControllerValue({
        tokens: null,
        tokensLoading: false,
        tokensError: null,
      }),
    );

    const { getByTestId } = renderWithProvider(TokenSelection);

    expect(
      getByTestId(TokenSelectionSelectors.LOADING_INDICATOR),
    ).toBeOnTheScreen();
  });

  it('displays error message when token fetch fails', () => {
    mockUseRampsController.mockReturnValue(
      createRampsControllerValue({
        tokens: null,
        tokensLoading: false,
        tokensError: 'Failed to load tokens',
      }),
    );

    const { getByText } = renderWithProvider(TokenSelection);

    expect(
      getByText('Unable to load tokens. Please try again later.'),
    ).toBeOnTheScreen();
    expect(getByText('Failed to load tokens')).toBeOnTheScreen();
  });

  it('uses topTokens when search string is empty', () => {
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);
    mockUseRampsController.mockReturnValue(
      createRampsControllerValue({
        tokens: {
          topTokens,
          allTokens,
        },
      }),
    );

    renderWithProvider(TokenSelection);

    expect(useSearchTokenResults).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: topTokens,
        searchString: '',
      }),
    );
  });

  it('uses allTokens when user is searching', async () => {
    const topTokens = convertToRampsTokens([mockTokens[0]]);
    const allTokens = convertToRampsTokens(mockTokens);
    mockUseRampsController.mockReturnValue(
      createRampsControllerValue({
        tokens: {
          topTokens,
          allTokens,
        },
      }),
    );
    const { getByPlaceholderText } = renderWithProvider(TokenSelection);

    fireEvent.changeText(
      getByPlaceholderText('Search token by name or address'),
      'USDC',
    );

    await waitFor(() => {
      expect(useSearchTokenResults).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: allTokens,
          searchString: 'USDC',
        }),
      );
    });
  });

  it('filters tokens to only include configured networks', () => {
    const allTokensWithUnconfiguredNetwork = convertToRampsTokens([
      ...mockTokens,
      {
        ...mockTokens[0],
        assetId: 'eip155:999/erc20:0x123',
        chainId: 'eip155:999',
      },
    ]);
    mockUseRampsController.mockReturnValue(
      createRampsControllerValue({
        tokens: {
          topTokens: allTokensWithUnconfiguredNetwork,
          allTokens: allTokensWithUnconfiguredNetwork,
        },
      }),
    );

    renderWithProvider(TokenSelection);

    expect(useSearchTokenResults).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.not.arrayContaining([
          expect.objectContaining({ chainId: 'eip155:999' }),
        ]),
      }),
    );
  });
});
