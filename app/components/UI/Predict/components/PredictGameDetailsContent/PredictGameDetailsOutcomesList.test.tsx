import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { View } from 'react-native';
import Engine from '../../../../../core/Engine';
import type {
  PredictMarket,
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PriceUpdate,
} from '../../types';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import PredictGameDetailsOutcomesList from './PredictGameDetailsOutcomesList';

let mockVisibleItemKeys: string[] | null = null;
let mockLatestFlashListExtraData: unknown;
let mockFlashListMountCount = 0;

jest.mock('@shopify/flash-list', () => {
  const ReactActual = jest.requireActual('react');
  const { View: ActualView } = jest.requireActual('react-native');

  return {
    __esModule: true,
    FlashList: ({
      data = [],
      extraData,
      keyExtractor,
      onViewableItemsChanged,
      renderItem,
      testID,
    }: {
      data?: unknown[];
      extraData?: unknown;
      keyExtractor?: (item: unknown, index: number) => string;
      onViewableItemsChanged?: (params: {
        viewableItems: { item: unknown; key: string; index: number }[];
      }) => void;
      renderItem: (params: { item: unknown; index: number }) => React.ReactNode;
      testID?: string;
    }) => {
      mockLatestFlashListExtraData = extraData;

      ReactActual.useEffect(() => {
        mockFlashListMountCount += 1;
      }, []);

      ReactActual.useEffect(() => {
        const visibleItems = mockVisibleItemKeys
          ? data.filter((item, index) =>
              mockVisibleItemKeys?.includes(
                keyExtractor ? keyExtractor(item, index) : `${index}`,
              ),
            )
          : data;

        onViewableItemsChanged?.({
          viewableItems: visibleItems.map((item, index) => ({
            item,
            key: keyExtractor ? keyExtractor(item, index) : `${index}`,
            index,
          })),
        });
      }, [data, keyExtractor, onViewableItemsChanged]);

      return (
        <ActualView testID={testID ?? 'mock-flash-list'}>
          {data.map((item, index) => (
            <ReactActual.Fragment
              key={keyExtractor ? keyExtractor(item, index) : index}
            >
              {renderItem({ item, index })}
            </ReactActual.Fragment>
          ))}
        </ActualView>
      );
    },
  };
});

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPrices: jest.fn(),
      subscribeToMarketPrices: jest.fn(),
      getConnectionStatus: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.market_details.your_picks': 'Your picks',
      'predict.sports_market_types.soccer_player_goals': 'Goals',
      'predict.sports_market_types.total_corners': 'Corners',
    };
    return translations[key] ?? key;
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: {
        default: 'blue',
      },
    },
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => []),
}));

jest.mock('../../hooks/usePredictCashOut', () => ({
  usePredictCashOut: () => ({
    onCashOut: jest.fn(),
  }),
}));

const createToken = (
  overrides: Partial<PredictOutcomeToken> = {},
): PredictOutcomeToken => {
  const tokenId = overrides.id ?? 'token-1';

  return {
    id: tokenId,
    title: tokenId,
    shortTitle: tokenId,
    price: 0.5,
    ...overrides,
  } as PredictOutcomeToken;
};

const createOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id: 'outcome-1',
    providerId: 'polymarket',
    marketId: 'market-1',
    title: 'Outcome',
    description: '',
    image: '',
    groupItemTitle: 'Outcome',
    status: 'open',
    volume: 1000,
    sportsMarketType: 'soccer_player_goals',
    tokens: [createToken({ id: 'over' }), createToken({ id: 'under' })],
    ...overrides,
  }) as PredictOutcome;

const mockGame: PredictMarketGame = {
  id: 'game-1',
  homeTeam: {
    id: 'home',
    name: 'Home',
    abbreviation: 'HOM',
    color: TEST_HEX_COLORS.PURE_BLACK,
    alias: 'Home',
    logo: '',
  },
  awayTeam: {
    id: 'away',
    name: 'Away',
    abbreviation: 'AWY',
    color: TEST_HEX_COLORS.WHITE_FULL,
    alias: 'Away',
    logo: '',
  },
  startTime: '2024-12-31T20:00:00Z',
  status: 'scheduled',
  league: 'epl',
  elapsed: null,
  period: null,
  score: null,
};

const createMarket = (overrides: Partial<PredictMarket> = {}): PredictMarket =>
  ({
    id: 'market-1',
    providerId: 'polymarket',
    slug: 'market-1',
    title: 'Market',
    description: '',
    image: '',
    status: 'open',
    recurrence: 'one-time',
    category: 'sports',
    tags: [],
    outcomes: [createOutcome()],
    liquidity: 1000,
    volume: 1000,
    game: mockGame,
    ...overrides,
  }) as PredictMarket;

const createSingleOutcomeGroup = ({
  groupKey = 'mixed',
  subgroupKey,
  outcome,
}: {
  groupKey?: string;
  subgroupKey: string;
  outcome: PredictOutcome;
}): PredictOutcomeGroup => ({
  key: groupKey,
  outcomes: [],
  subgroups: [
    {
      key: subgroupKey,
      title: subgroupKey,
      outcomes: [outcome],
    },
  ],
});

const createLineGroup = (): PredictOutcomeGroup => ({
  key: 'game_lines',
  outcomes: [],
  subgroups: [
    {
      key: 'total_corners',
      title: 'Corners',
      outcomes: [
        createOutcome({
          id: 'line-85',
          groupItemTitle: 'Total Corners: O/U 8.5',
          sportsMarketType: 'total_corners',
          line: 8.5,
          volume: 1000,
          tokens: [
            createToken({ id: 'over-85', shortTitle: 'O 8.5' }),
            createToken({ id: 'under-85', shortTitle: 'U 8.5' }),
          ],
        }),
        createOutcome({
          id: 'line-95',
          groupItemTitle: 'Total Corners: O/U 9.5',
          sportsMarketType: 'total_corners',
          line: 9.5,
          volume: 5000,
          tokens: [
            createToken({ id: 'over-95', shortTitle: 'O 9.5' }),
            createToken({ id: 'under-95', shortTitle: 'U 9.5' }),
          ],
        }),
      ],
    },
  ],
});

const createDefaultProps = (
  overrides: Partial<
    React.ComponentProps<typeof PredictGameDetailsOutcomesList>
  > = {},
): React.ComponentProps<typeof PredictGameDetailsOutcomesList> => {
  const group = createSingleOutcomeGroup({
    subgroupKey: 'visible_card',
    outcome: createOutcome({
      id: 'visible-outcome',
      tokens: [
        createToken({ id: 'visible-over' }),
        createToken({ id: 'visible-under' }),
      ],
    }),
  });

  return {
    market: createMarket(),
    enabled: true,
    groupMap: new Map([[group.key, group]]),
    activeChipKey: group.key,
    onBetPress: jest.fn(),
    refreshing: false,
    onRefresh: jest.fn(),
    showTabBar: true,
    tabs: [{ key: 'outcomes', label: 'Outcomes' }],
    activeTab: 0,
    onTabPress: jest.fn(),
    showChips: true,
    chips: [{ key: group.key, label: 'Mixed' }],
    onChipSelect: jest.fn(),
    activePositions: [],
    claimablePositions: [],
    ...overrides,
  };
};

const settleVisibility = () => {
  act(() => {
    jest.advanceTimersByTime(200);
  });
};

describe('PredictGameDetailsOutcomesList', () => {
  const mockGetPrices = Engine.context.PredictController.getPrices as jest.Mock;
  const mockSubscribeToMarketPrices = Engine.context.PredictController
    .subscribeToMarketPrices as jest.Mock;
  const mockGetConnectionStatus = Engine.context.PredictController
    .getConnectionStatus as jest.Mock;
  let capturedPriceCallback: (updates: PriceUpdate[]) => void = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockVisibleItemKeys = null;
    mockLatestFlashListExtraData = undefined;
    mockFlashListMountCount = 0;
    capturedPriceCallback = jest.fn();
    mockGetPrices.mockResolvedValue({ providerId: 'polymarket', results: [] });
    mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
      capturedPriceCallback = callback;
      return jest.fn();
    });
    mockGetConnectionStatus.mockReturnValue({
      sportsConnected: false,
      marketConnected: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the list header, sticky controls, and outcome content', () => {
    const props = createDefaultProps({
      listHeaderComponent: <View testID="list-header" />,
    });

    const { getByTestId } = render(
      <PredictGameDetailsOutcomesList {...props} />,
    );

    expect(getByTestId('list-header')).toBeOnTheScreen();
    expect(
      getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT),
    ).toBeOnTheScreen();
    expect(getByTestId('predict-chip-mixed')).toBeOnTheScreen();
    expect(getByTestId('mixed-visible_card')).toBeOnTheScreen();
  });

  it('renders positions content for the positions tab', () => {
    const props = createDefaultProps({
      showChips: false,
      tabs: [{ key: 'positions', label: 'Positions' }],
      activeTab: 0,
    });

    const { getByTestId } = render(
      <PredictGameDetailsOutcomesList {...props} />,
    );

    expect(
      getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.TAB_CONTENT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK),
    ).toBeOnTheScreen();
  });

  it('subscribes only to visible rendered-button token IDs', async () => {
    const visibleGroup = createSingleOutcomeGroup({
      subgroupKey: 'visible_card',
      outcome: createOutcome({
        id: 'visible-outcome',
        tokens: [
          createToken({ id: 'visible-over' }),
          createToken({ id: 'visible-under' }),
        ],
      }),
    });
    const hiddenGroup = createSingleOutcomeGroup({
      subgroupKey: 'hidden_card',
      outcome: createOutcome({
        id: 'hidden-outcome',
        tokens: [
          createToken({ id: 'hidden-over' }),
          createToken({ id: 'hidden-under' }),
        ],
      }),
    });
    const mixedGroup: PredictOutcomeGroup = {
      key: 'mixed',
      outcomes: [],
      subgroups: [
        ...(visibleGroup.subgroups ?? []),
        ...(hiddenGroup.subgroups ?? []),
      ],
    };
    mockVisibleItemKeys = ['game-details-outcome-visible-outcome'];

    render(
      <PredictGameDetailsOutcomesList
        {...createDefaultProps({
          groupMap: new Map([[mixedGroup.key, mixedGroup]]),
          activeChipKey: mixedGroup.key,
          chips: [{ key: mixedGroup.key, label: 'Mixed' }],
        })}
      />,
    );
    settleVisibility();

    await waitFor(() => {
      expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
        ['visible-over', 'visible-under'],
        expect.any(Function),
      );
    });
    expect(mockSubscribeToMarketPrices).not.toHaveBeenCalledWith(
      ['hidden-over', 'hidden-under'],
      expect.any(Function),
    );
  });

  it('subscribes only to the default selected line tokens for visible line cards', async () => {
    const lineGroup = createLineGroup();
    mockVisibleItemKeys = ['game-details-outcome-total_corners'];

    render(
      <PredictGameDetailsOutcomesList
        {...createDefaultProps({
          groupMap: new Map([[lineGroup.key, lineGroup]]),
          activeChipKey: lineGroup.key,
          chips: [{ key: lineGroup.key, label: 'Game Lines' }],
        })}
      />,
    );
    settleVisibility();

    await waitFor(() => {
      expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
        ['over-95', 'under-95'],
        expect.any(Function),
      );
    });
    expect(mockSubscribeToMarketPrices).not.toHaveBeenCalledWith(
      ['over-85', 'under-85', 'over-95', 'under-95'],
      expect.any(Function),
    );
  });

  it('passes price version changes through FlashList extraData', async () => {
    mockVisibleItemKeys = ['game-details-outcome-visible-outcome'];
    render(<PredictGameDetailsOutcomesList {...createDefaultProps()} />);
    settleVisibility();
    await waitFor(() => {
      expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
        ['visible-over', 'visible-under'],
        expect.any(Function),
      );
    });

    act(() => {
      capturedPriceCallback([
        {
          tokenId: 'visible-over',
          price: 0.72,
          bestBid: 0.71,
          bestAsk: 0.73,
        },
      ]);
    });

    expect(mockLatestFlashListExtraData).toEqual(
      expect.objectContaining({
        priceVersion: 1,
      }),
    );
  });

  it('does not remount FlashList when tab scope changes', () => {
    const commonProps = createDefaultProps({
      showChips: false,
      tabs: [
        { key: 'outcomes', label: 'Outcomes' },
        { key: 'positions', label: 'Positions' },
      ],
    });
    const { rerender } = render(
      <PredictGameDetailsOutcomesList {...commonProps} activeTab={0} />,
    );

    rerender(<PredictGameDetailsOutcomesList {...commonProps} activeTab={1} />);

    expect(mockFlashListMountCount).toBe(1);
  });
});
