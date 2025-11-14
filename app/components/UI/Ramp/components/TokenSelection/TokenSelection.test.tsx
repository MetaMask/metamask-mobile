import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TokenSelection from './TokenSelection';
import { useParams } from '../../../../../util/navigation/navUtils';
import useSearchTokenResults from '../../Deposit/hooks/useSearchTokenResults';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { MOCK_CRYPTOCURRENCIES } from '../../Deposit/testUtils';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
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
          detectedGeolocation: 'US',
        },
      },
    },
  );
}

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

jest.mock('../../Deposit/hooks/useSearchTokenResults', () => jest.fn());

const mockTokens = MOCK_CRYPTOCURRENCIES;

describe('TokenSelection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      rampType: 'BUY',
      selectedCryptoAssetId: undefined,
    });
    (useSearchTokenResults as jest.Mock).mockReturnValue(mockTokens);
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

  it('marks token as selected when selectedCryptoAssetId matches', () => {
    (useParams as jest.Mock).mockReturnValue({
      rampType: 'BUY',
      selectedCryptoAssetId: mockTokens[0].assetId,
    });

    const { toJSON } = renderWithProvider(TokenSelection);

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

  describe('token selection navigation', () => {
    it('renders correctly when rampType is DEPOSIT', () => {
      (useParams as jest.Mock).mockReturnValue({
        rampType: 'DEPOSIT',
      });

      const { toJSON } = renderWithProvider(TokenSelection);

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly when rampType is BUY', () => {
      (useParams as jest.Mock).mockReturnValue({
        rampType: 'BUY',
      });

      const { toJSON } = renderWithProvider(TokenSelection);

      expect(toJSON()).toMatchSnapshot();
    });

    it('renders correctly when rampType is undefined', () => {
      (useParams as jest.Mock).mockReturnValue({
        rampType: undefined,
      });

      const { toJSON } = renderWithProvider(TokenSelection);

      expect(toJSON()).toMatchSnapshot();
    });

    it('navigates to buy route when token is pressed with BUY rampType', () => {
      (useParams as jest.Mock).mockReturnValue({
        rampType: 'BUY',
      });
      const { getAllByRole } = renderWithProvider(TokenSelection);

      const tokenButtons = getAllByRole('button');
      const firstToken = tokenButtons[0];
      fireEvent.press(firstToken);

      expect(mockNavigate).toHaveBeenCalledWith(
        'AggregatorBuy',
        expect.objectContaining({
          assetId: mockTokens[0].assetId,
        }),
      );
    });

    it('navigates to deposit route when token is pressed with DEPOSIT rampType', () => {
      (useParams as jest.Mock).mockReturnValue({
        rampType: 'DEPOSIT',
      });
      const { getAllByRole } = renderWithProvider(TokenSelection);

      const tokenButtons = getAllByRole('button');
      const firstToken = tokenButtons[0];
      fireEvent.press(firstToken);

      expect(mockNavigate).toHaveBeenCalledWith(
        'DepositAmount',
        expect.objectContaining({
          assetId: mockTokens[0].assetId,
        }),
      );
    });
  });
});
