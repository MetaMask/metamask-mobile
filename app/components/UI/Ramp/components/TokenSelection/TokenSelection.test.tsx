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

jest.mock('../../hooks/useRampTokens', () => ({
  useRampTokens: jest.fn(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

const mockGetNetworkName = jest.fn();
jest.mock('../../Deposit/hooks/useDepositCryptoCurrencyNetworkName', () => ({
  useDepositCryptoCurrencyNetworkName: () => mockGetNetworkName,
}));

const mockTokens = MOCK_CRYPTOCURRENCIES;
const mockUseRampTokens = useRampTokens as jest.MockedFunction<
  typeof useRampTokens
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

    const rampsTokens = convertToRampsTokens(mockTokens);
    mockUseRampTokens.mockReturnValue({
      topTokens: rampsTokens,
      allTokens: rampsTokens,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly and matches snapshot', () => {
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

  it('calls goToBuy when token is pressed', () => {
    const { getByTestId } = renderWithProvider(TokenSelection);

    const firstToken = getByTestId(`token-list-item-${mockTokens[0].assetId}`);
    fireEvent.press(firstToken);

    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: mockTokens[0].assetId,
    });
    expect(mockParentGoBack).toHaveBeenCalled();
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

  it('displays error message when token fetch fails', () => {
    mockUseRampTokens.mockReturnValue({
      topTokens: null,
      allTokens: null,
      isLoading: false,
      error: new Error('Network error'),
    });

    const { getByText } = renderWithProvider(TokenSelection);

    expect(getByText(/unable to load tokens/i)).toBeOnTheScreen();
  });

  it('uses topTokens when search string is empty', () => {
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

  it('uses allTokens when user is searching', async () => {
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

  it('uses topTokens when search string contains only whitespace', () => {
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
});
