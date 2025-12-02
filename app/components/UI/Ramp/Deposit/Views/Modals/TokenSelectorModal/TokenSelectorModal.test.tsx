import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TokenSelectorModal from './TokenSelectorModal';
import { useParams } from '../../../../../../../util/navigation/navUtils';
import useSearchTokenResults from '../../../hooks/useSearchTokenResults';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../../util/test/initial-root-state';
import { MOCK_CRYPTOCURRENCIES } from '../../../testUtils';
import { UnifiedRampRoutingType } from '../../../../../../../reducers/fiatOrders';

const mockSetCryptoCurrency = jest.fn();
const mockUseDepositSDK = jest.fn();
jest.mock('../../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics', () => () => mockTrackEvent);

function renderWithProvider(
  component: React.ComponentType,
  rampRoutingDecision: UnifiedRampRoutingType | null = null,
) {
  return renderScreen(
    component,
    {
      name: 'TokenSelectorModal',
    },
    {
      state: {
        ...initialRootState,
        fiatOrders: {
          ...initialRootState.fiatOrders,
          rampRoutingDecision,
        },
      },
    },
  );
}

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('../../../hooks/useSearchTokenResults', () => jest.fn());

const mockTokens = MOCK_CRYPTOCURRENCIES;

describe('TokenSelectorModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      cryptoCurrencies: mockTokens,
    });
    (useSearchTokenResults as jest.Mock).mockReturnValue(mockTokens);

    mockUseDepositSDK.mockReturnValue({
      setSelectedCryptoCurrency: mockSetCryptoCurrency,
      selectedRegion: { isoCode: 'US', currency: 'USD' },
      isAuthenticated: false,
      selectedCryptoCurrency: mockTokens[0],
    });
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(TokenSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays network filter selector when pressing "All networks" button', async () => {
    const { getByText, toJSON } = renderWithProvider(TokenSelectorModal);
    const allNetworksButton = getByText('All networks');
    fireEvent.press(allNetworksButton);
    await waitFor(() => {
      expect(getByText('Deselect all')).toBeTruthy();
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays empty state when no tokens match search', async () => {
    (useSearchTokenResults as jest.Mock).mockReturnValue([]);
    const { getByPlaceholderText, getByText, toJSON } =
      renderWithProvider(TokenSelectorModal);

    const searchInput = getByPlaceholderText('Search token by name or address');
    fireEvent.changeText(searchInput, 'Nonexistent Token');

    await waitFor(() => {
      expect(getByText('No tokens match "Nonexistent Token"')).toBeTruthy();
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks RAMPS_TOKEN_SELECTED event with new properties when token is selected', () => {
    const { getAllByText } = renderWithProvider(
      TokenSelectorModal,
      UnifiedRampRoutingType.DEPOSIT,
    );

    const tokenElements = getAllByText('USDC');
    fireEvent.press(tokenElements[0]);

    expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_TOKEN_SELECTED', {
      ramp_type: 'DEPOSIT',
      region: 'US',
      chain_id: MOCK_CRYPTOCURRENCIES[0].chainId,
      currency_destination: MOCK_CRYPTOCURRENCIES[0].assetId,
      currency_destination_symbol: MOCK_CRYPTOCURRENCIES[0].symbol,
      currency_destination_network: expect.any(String),
      currency_source: 'USD',
      is_authenticated: false,
      token_caip19: MOCK_CRYPTOCURRENCIES[0].assetId,
      token_symbol: MOCK_CRYPTOCURRENCIES[0].symbol,
      ramp_routing: 'DEPOSIT',
    });
  });

  it('tracks RAMPS_TOKEN_SELECTED event with AGGREGATOR BUY routing when routing decision is AGGREGATOR', () => {
    const { getAllByText } = renderWithProvider(
      TokenSelectorModal,
      UnifiedRampRoutingType.AGGREGATOR,
    );

    const tokenElements = getAllByText('USDC');
    fireEvent.press(tokenElements[0]);

    expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_TOKEN_SELECTED', {
      ramp_type: 'DEPOSIT',
      region: 'US',
      chain_id: MOCK_CRYPTOCURRENCIES[0].chainId,
      currency_destination: MOCK_CRYPTOCURRENCIES[0].assetId,
      currency_destination_symbol: MOCK_CRYPTOCURRENCIES[0].symbol,
      currency_destination_network: expect.any(String),
      currency_source: 'USD',
      is_authenticated: false,
      token_caip19: MOCK_CRYPTOCURRENCIES[0].assetId,
      token_symbol: MOCK_CRYPTOCURRENCIES[0].symbol,
      ramp_routing: UnifiedRampRoutingType.AGGREGATOR,
    });
  });

  it('tracks RAMPS_TOKEN_SELECTED event with undefined ramp_routing when routing decision is null', () => {
    const { getAllByText } = renderWithProvider(TokenSelectorModal, null);

    const tokenElements = getAllByText('USDC');
    fireEvent.press(tokenElements[0]);

    expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_TOKEN_SELECTED', {
      ramp_type: 'DEPOSIT',
      region: 'US',
      chain_id: MOCK_CRYPTOCURRENCIES[0].chainId,
      currency_destination: MOCK_CRYPTOCURRENCIES[0].assetId,
      currency_destination_symbol: MOCK_CRYPTOCURRENCIES[0].symbol,
      currency_destination_network: expect.any(String),
      currency_source: 'USD',
      is_authenticated: false,
      token_caip19: MOCK_CRYPTOCURRENCIES[0].assetId,
      token_symbol: MOCK_CRYPTOCURRENCIES[0].symbol,
      ramp_routing: undefined,
    });
  });
});
