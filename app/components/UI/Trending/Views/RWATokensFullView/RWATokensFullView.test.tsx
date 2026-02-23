import React from 'react';
import { userEvent, fireEvent } from '@testing-library/react-native';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import RWATokensFullView from './RWATokensFullView';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useRwaTokens } from '../../hooks/useRwaTokens/useRwaTokens';
import type TrendingTokensList from '../../components/TrendingTokensList';
import mockState from '../../../../../util/test/initial-root-state';

const TEST_IDS = {
  skeleton: 'trending-tokens-skeleton',
  emptySearchResult: 'empty-search-result-state',
  emptyErrorState: 'empty-error-trending-state',
  tokensList: 'trending-tokens-list',
} as const;

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  createNavigatorFactory: () => ({}),
}));

jest.mock('../../hooks/useRwaTokens/useRwaTokens');
const mockUseRwaTokens = jest.mocked(useRwaTokens);

jest.mock(
  '../../components/TrendingTokensList/TrendingTokensList',
  (): typeof TrendingTokensList => {
    const { View, Text, ScrollView } = jest.requireActual('react-native');
    return ({ trendingTokens, refreshControl }) => (
      <ScrollView testID="trending-tokens-list" refreshControl={refreshControl}>
        {trendingTokens.map((token, index) => (
          <View key={token.assetId || index} testID={`token-${index}`}>
            <Text>{token.name}</Text>
          </View>
        ))}
      </ScrollView>
    );
  },
);

const createMockToken = (
  overrides: Partial<TrendingAsset> = {},
): TrendingAsset => ({
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  name: 'OUSG Token',
  symbol: 'OUSG',
  decimals: 18,
  price: '100.50',
  aggregatedUsdVolume: 500000,
  marketCap: 1000000000,
  priceChangePct: { h24: '1.5' },
  ...overrides,
});

const arrangeMocks = () => {
  const mockRefetch = jest.fn();

  const setRwaTokensMock = (options: {
    data?: TrendingAsset[];
    isLoading?: boolean;
  }) => {
    mockUseRwaTokens.mockReturnValue({
      data: options.data ?? [],
      isLoading: options.isLoading ?? false,
      refetch: mockRefetch,
    });
  };

  setRwaTokensMock({});

  return {
    mockRefetch,
    mockGoBack,
    mockNavigate,
    setRwaTokensMock,
  };
};

describe('RWATokensFullView', () => {
  const renderRWAFullView = () =>
    renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <RWATokensFullView />
      </SafeAreaProvider>,
      { state: mockState },
      false,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    arrangeMocks();
  });

  it('renders header with Stocks title', () => {
    const { getByText } = renderRWAFullView();

    expect(getByText('Stocks')).toBeOnTheScreen();
  });

  it('does not render the time filter button', () => {
    const { queryByTestId } = renderRWAFullView();

    expect(queryByTestId('24h-button')).toBeNull();
  });

  it('renders price-change and network filter buttons', () => {
    const { getByTestId } = renderRWAFullView();

    expect(getByTestId('price-change-button')).toBeOnTheScreen();
    expect(getByTestId('all-networks-button')).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', async () => {
    const mocks = arrangeMocks();
    const { getByTestId } = renderRWAFullView();

    const backButton = getByTestId('rwa-tokens-header-back-button');
    await userEvent.press(backButton);

    expect(mocks.mockGoBack).toHaveBeenCalled();
  });

  it('displays skeleton loader when loading', () => {
    const mocks = arrangeMocks();
    mocks.setRwaTokensMock({ data: [], isLoading: true });

    const { getByTestId } = renderRWAFullView();

    expect(getByTestId(TEST_IDS.skeleton)).toBeOnTheScreen();
  });

  it('displays empty error state when results are empty', () => {
    const mocks = arrangeMocks();
    mocks.setRwaTokensMock({ data: [] });

    const { getByTestId } = renderRWAFullView();

    expect(getByTestId(TEST_IDS.emptyErrorState)).toBeOnTheScreen();
  });

  it('displays stocks data from useRwaTokens', () => {
    const stockTokens = [
      createMockToken({
        name: 'OUSG Token',
        assetId: 'eip155:1/erc20:0xstock1',
      }),
      createMockToken({
        name: 'USDY Token',
        assetId: 'eip155:1/erc20:0xstock2',
      }),
    ];

    const mocks = arrangeMocks();
    mocks.setRwaTokensMock({ data: stockTokens });

    const { getByText, getByTestId } = renderRWAFullView();

    expect(getByTestId(TEST_IDS.tokensList)).toBeOnTheScreen();
    expect(getByText('OUSG Token')).toBeOnTheScreen();
    expect(getByText('USDY Token')).toBeOnTheScreen();
  });

  it('calls refetch when pull-to-refresh is triggered', () => {
    const stockTokens = [
      createMockToken({ name: 'OUSG', assetId: 'eip155:1/erc20:0xstock1' }),
    ];

    const mocks = arrangeMocks();
    mocks.setRwaTokensMock({ data: stockTokens });

    const { getByTestId, UNSAFE_getByType } = renderRWAFullView();

    expect(getByTestId(TEST_IDS.tokensList)).toBeOnTheScreen();
    const { RefreshControl } = jest.requireActual('react-native');
    const refreshControl = UNSAFE_getByType(RefreshControl);
    fireEvent(refreshControl, 'refresh');

    expect(mocks.mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('opens network bottom sheet when button is pressed', async () => {
    const { getByTestId } = renderRWAFullView();

    const networkButton = getByTestId('all-networks-button');
    await userEvent.press(networkButton);

    expect(
      getByTestId('trending-token-network-bottom-sheet'),
    ).toBeOnTheScreen();
  });

  it('opens price change bottom sheet when button is pressed', async () => {
    const { getByTestId } = renderRWAFullView();

    const priceChangeButton = getByTestId('price-change-button');
    await userEvent.press(priceChangeButton);

    expect(
      getByTestId('trending-token-price-change-bottom-sheet'),
    ).toBeOnTheScreen();
  });
});
