import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WatchlistEmptyCTA from './WatchlistEmptyCTA';
import { WatchlistEmptyCTATestIds } from './WatchlistEmptyCTA.testIds';
import type { WatchlistTokenWithBalance } from '../../utils/addBalanceToTokens';

const mockMutate = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockUseSuggestedWatchlistItemsQuery = jest.fn();

jest.mock('../../hooks/useSuggestedWatchlistItemsQuery', () => ({
  useSuggestedWatchlistItemsQuery: () => mockUseSuggestedWatchlistItemsQuery(),
}));

jest.mock('../../hooks/useTokenWatchlistMutations', () => ({
  useTokenWatchlistAddItemMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 34, top: 0, left: 0, right: 0 }),
}));

jest.mock('../WatchlistDefaultTokenCard', () => {
  const { Text, TouchableOpacity, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = ({
    token,
    isSelected,
    onToggle,
  }: {
    token: { assetId: string; symbol: string };
    isSelected: boolean;
    onToggle: (assetId: string) => void;
  }) =>
    ReactActual.createElement(
      TouchableOpacity,
      {
        testID: `mock-card-${token.assetId}`,
        onPress: () => onToggle(String(token.assetId)),
      },
      ReactActual.createElement(Text, null, token.symbol),
      ReactActual.createElement(
        Text,
        { testID: `mock-card-selected-${token.assetId}` },
        isSelected ? 'selected' : 'unselected',
      ),
    );
  Mock.displayName = 'WatchlistDefaultTokenCard';
  return Mock;
});

const makeToken = (
  assetId: string,
  symbol: string,
): WatchlistTokenWithBalance => ({
  assetId,
  symbol,
  name: symbol,
  decimals: 18,
  balance: '0',
  isInWallet: false,
  marketData: { pricePercentChange24h: 1.2 },
});

describe('WatchlistEmptyCTA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ name: 'Watchlist Token Added' }),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [
        makeToken('eip155:1/slip44:60', 'ETH'),
        makeToken('bip122:000000000019d6689c085ae165831e93/slip44:0', 'BTC'),
      ],
      isLoading: false,
    });
  });

  it('renders all suggested tokens selected by default', () => {
    const { getByTestId } = render(
      <WatchlistEmptyCTA source="watchlist_empty_cta" />,
    );

    expect(
      getByTestId('mock-card-selected-eip155:1/slip44:60').props.children,
    ).toBe('selected');
    expect(
      getByTestId(
        'mock-card-selected-bip122:000000000019d6689c085ae165831e93/slip44:0',
      ).props.children,
    ).toBe('selected');
  });

  it('renders sticky footer matching TDP layout', () => {
    const { getByTestId } = render(
      <WatchlistEmptyCTA source="watchlist_empty_cta" />,
    );

    const footer = getByTestId('bottomsheetfooter');
    expect(footer).toBeDefined();
    expect(footer.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flexDirection: 'column',
          alignItems: 'flex-start',
        }),
        expect.objectContaining({
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 40,
        }),
        expect.not.objectContaining({ flex: 1 }),
      ]),
    );
  });

  it('shows add button with selected count', () => {
    const { getByTestId, getByText } = render(
      <WatchlistEmptyCTA source="watchlist_empty_cta" />,
    );

    expect(getByTestId(WatchlistEmptyCTATestIds.ADD_BUTTON)).toBeDefined();
    expect(getByText('Add 2 tokens')).toBeDefined();
  });

  it('disables add button when no tokens are selected', () => {
    const { getByTestId } = render(
      <WatchlistEmptyCTA source="watchlist_empty_cta" />,
    );

    fireEvent.press(getByTestId('mock-card-eip155:1/slip44:60'));
    fireEvent.press(
      getByTestId('mock-card-bip122:000000000019d6689c085ae165831e93/slip44:0'),
    );

    expect(
      getByTestId(WatchlistEmptyCTATestIds.ADD_BUTTON).props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });

  it('calls add mutation with selected asset IDs', () => {
    const { getByTestId } = render(
      <WatchlistEmptyCTA source="watchlist_empty_cta" />,
    );

    fireEvent.press(getByTestId('mock-card-eip155:1/slip44:60'));
    fireEvent.press(getByTestId(WatchlistEmptyCTATestIds.ADD_BUTTON));

    expect(mockMutate).toHaveBeenCalledWith([
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
    ]);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('renders skeleton cards while loading', () => {
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getAllByTestId } = render(
      <WatchlistEmptyCTA source="watchlist_empty_cta" />,
    );

    expect(
      getAllByTestId(WatchlistEmptyCTATestIds.SKELETON).length,
    ).toBeGreaterThan(0);
  });
});
