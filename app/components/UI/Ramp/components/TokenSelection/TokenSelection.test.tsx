import React from 'react';
import { ActivityIndicator } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import TokenSelection from './TokenSelection';
import { useParams } from '../../../../../util/navigation/navUtils';
import useSearchTokenResults from '../../Deposit/hooks/useSearchTokenResults';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { MOCK_CRYPTOCURRENCIES } from '../../Deposit/testUtils';
import { UnifiedRampRoutingType } from '../../../../../reducers/fiatOrders/types';
import { useRampTokens } from '../../hooks/useRampTokens';

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
          rampRoutingDecision: UnifiedRampRoutingType.DEPOSIT,
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

jest.mock('../../hooks/useRampTokens', () => ({
  useRampTokens: jest.fn(),
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
    (useParams as jest.Mock).mockReturnValue({
      intent: undefined,
    });
    (useSearchTokenResults as jest.Mock).mockReturnValue(mockTokens);

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

  it('marks token as selected when intent assetId matches', () => {
    (useParams as jest.Mock).mockReturnValue({
      intent: {
        assetId: mockTokens[0].assetId,
      },
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
});
