import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TokenSelectorModal from './TokenSelectorModal';
import { useParams } from '../../../../../../../util/navigation/navUtils';
import useSearchTokenResults from '../../../hooks/useSearchTokenResults';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { MOCK_CRYPTOCURRENCIES } from '../../../testUtils';

const mockSetCryptoCurrency = jest.fn();
const mockUseDepositSDK = jest.fn();
jest.mock('../../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics', () => () => mockTrackEvent);

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'TokenSelectorModal',
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
});
