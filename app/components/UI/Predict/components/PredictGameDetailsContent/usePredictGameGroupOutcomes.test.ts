import { renderHook } from '@testing-library/react-hooks';
import type {
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { usePredictGameGroupOutcomes } from './usePredictGameGroupOutcomes';
import { buildOutcomeCardModels } from './outcomeCardModel';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.sports_market_types.moneyline': 'Moneyline',
      'predict.sports_market_types.total_corners': 'Corners',
      'predict.sports_market_types.soccer_player_goals': 'Goals',
    };

    return translations[key] ?? key;
  }),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const createToken = (
  overrides: Partial<PredictOutcomeToken> = {},
): PredictOutcomeToken =>
  ({
    id: 'token-1',
    title: 'Team A',
    shortTitle: 'TA',
    price: 0.65,
    ...overrides,
  }) as PredictOutcomeToken;

const createOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id: 'outcome-1',
    marketId: 'market-1',
    title: 'Team A vs Team B',
    groupItemTitle: 'Team A vs Team B',
    status: 'open',
    volume: 50000,
    sportsMarketType: 'moneyline',
    tokens: [
      createToken({
        id: 'token-a',
        title: 'Team A',
        shortTitle: 'TA',
        price: 0.65,
      }),
      createToken({
        id: 'token-b',
        title: 'Team B',
        shortTitle: 'TB',
        price: 0.35,
      }),
    ],
    ...overrides,
  }) as PredictOutcome;

const createCard = (
  overrides: Partial<PredictOutcomeGroup> = {},
): PredictOutcomeGroup => ({
  key: 'moneyline',
  outcomes: [createOutcome()],
  ...overrides,
});

const createGroup = (
  key: string,
  subgroups: PredictOutcomeGroup[],
): PredictOutcomeGroup => ({
  key,
  outcomes: [],
  subgroups,
});

describe('usePredictGameGroupOutcomes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty values when no group is provided', () => {
    const { result } = renderHook(() => usePredictGameGroupOutcomes({}));

    expect(result.current).toEqual({
      openCardModels: [],
      closedOutcomes: [],
      showResolvedSection: false,
    });
  });

  it('builds open card models and collects closed outcomes separately', () => {
    const group = createGroup('game_lines', [
      createCard({
        key: 'moneyline',
        outcomes: [
          createOutcome({
            id: 'moneyline-home',
            status: 'open',
            sportsMarketType: 'moneyline',
            tokens: [createToken({ id: 'ml-home', price: 0.6 })],
          }),
          createOutcome({
            id: 'moneyline-away',
            status: 'closed',
            sportsMarketType: 'moneyline',
            tokens: [createToken({ id: 'ml-away', price: 0.4 })],
          }),
        ],
      }),
      createCard({
        key: 'total_corners',
        outcomes: [
          createOutcome({
            id: 'corners-open',
            status: 'open',
            sportsMarketType: 'total_corners',
            groupItemTitle: 'Total Corners: O/U 8.5',
            line: 8.5,
            tokens: [
              createToken({ id: 'corners-over-85' }),
              createToken({ id: 'corners-under-85' }),
            ],
          }),
          createOutcome({
            id: 'corners-closed',
            status: 'resolved',
            sportsMarketType: 'total_corners',
            groupItemTitle: 'Total Corners: O/U 9.5',
            line: 9.5,
            tokens: [
              createToken({ id: 'corners-over-95' }),
              createToken({ id: 'corners-under-95' }),
            ],
          }),
        ],
      }),
    ]);

    const { result } = renderHook(() =>
      usePredictGameGroupOutcomes({
        group,
      }),
    );

    expect(result.current.openCardModels).toEqual([
      expect.objectContaining({
        kind: 'simple',
        key: 'moneyline-home',
      }),
      expect.objectContaining({
        kind: 'simple',
        key: 'corners-open',
        title: 'Corners',
      }),
    ]);
    expect(result.current.closedOutcomes.map((outcome) => outcome.id)).toEqual([
      'moneyline-away',
      'corners-closed',
    ]);
    expect(result.current.showResolvedSection).toBe(true);
  });

  it('returns only closed outcomes when the entire group is settled', () => {
    const group = createGroup('props', [
      createCard({
        key: 'player_goals',
        outcomes: [
          createOutcome({
            id: 'player-closed',
            status: 'closed',
            sportsMarketType: 'soccer_player_goals',
          }),
        ],
      }),
    ]);

    const { result } = renderHook(() =>
      usePredictGameGroupOutcomes({
        group,
      }),
    );

    expect(result.current.openCardModels).toEqual([]);
    expect(result.current.closedOutcomes).toHaveLength(1);
    expect(result.current.showResolvedSection).toBe(true);
  });

  it('treats resolved outcomes with open status but resolved resolutionStatus as closed', () => {
    const group = createGroup('first_set', [
      createCard({
        key: 'tennis_first_set_winner',
        outcomes: [
          createOutcome({
            id: 'set-1-winner',
            status: 'open',
            resolutionStatus: 'resolved',
            sportsMarketType: 'tennis_first_set_winner',
            groupItemTitle: 'Set 1 Winner',
          }),
        ],
      }),
    ]);

    const { result } = renderHook(() =>
      usePredictGameGroupOutcomes({
        group,
      }),
    );

    expect(result.current.openCardModels).toEqual([]);
    expect(result.current.closedOutcomes.map((outcome) => outcome.id)).toEqual([
      'set-1-winner',
    ]);
    expect(result.current.showResolvedSection).toBe(true);
  });

  it('groups all settled first-set tennis outcomes into the resolved section', () => {
    const createClosedSetOutcome = (
      id: string,
      sportsMarketType: string,
      groupItemTitle: string,
      line?: number,
    ) =>
      createOutcome({
        id,
        status: 'closed',
        resolutionStatus: 'resolved',
        sportsMarketType,
        groupItemTitle,
        ...(line !== undefined && { line }),
        tokens: [
          createToken({ id: `${id}-yes`, price: 1 }),
          createToken({ id: `${id}-no`, price: 0 }),
        ],
      });

    const group = createGroup('first_set', [
      createCard({
        key: 'tennis_first_set_winner',
        outcomes: [
          createClosedSetOutcome(
            'set-1-winner',
            'tennis_first_set_winner',
            'Set 1 Winner',
          ),
        ],
      }),
      createCard({
        key: 'tennis_first_set_totals',
        outcomes: [
          createClosedSetOutcome(
            'set-1-total-85',
            'tennis_first_set_totals',
            'Set 1 O/U 8.5',
            8.5,
          ),
          createClosedSetOutcome(
            'set-1-total-95',
            'tennis_first_set_totals',
            'Set 1 O/U 9.5',
            9.5,
          ),
          createClosedSetOutcome(
            'set-1-total-105',
            'tennis_first_set_totals',
            'Set 1 O/U 10.5',
            10.5,
          ),
        ],
      }),
    ]);

    const { result } = renderHook(() =>
      usePredictGameGroupOutcomes({
        group,
      }),
    );

    expect(result.current.openCardModels).toEqual([]);
    expect(result.current.closedOutcomes).toHaveLength(4);
    expect(result.current.showResolvedSection).toBe(true);
  });

  it('builds open card models and de-duplicated token ids for subgrouped outcomes', () => {
    const group = createGroup('game_lines', [
      createCard({
        key: 'moneyline',
        outcomes: [
          createOutcome({
            id: 'moneyline-home',
            sportsMarketType: 'moneyline',
            tokens: [createToken({ id: 'ml-home', price: 0.6 })],
          }),
          createOutcome({
            id: 'moneyline-away',
            sportsMarketType: 'moneyline',
            tokens: [createToken({ id: 'ml-away', price: 0.4 })],
          }),
        ],
      }),
      createCard({
        key: 'soccer_player_goals-0',
        title: 'Player One',
        outcomes: [
          createOutcome({
            id: 'player-goals',
            sportsMarketType: 'soccer_player_goals',
            groupItemTitle: 'Player One: 1+ goals',
            tokens: [
              createToken({ id: 'player-over', shortTitle: 'Over' }),
              createToken({ id: 'player-under', shortTitle: 'Under' }),
            ],
          }),
        ],
      }),
      createCard({
        key: 'total_corners',
        outcomes: [
          createOutcome({
            id: 'corners-85',
            sportsMarketType: 'total_corners',
            groupItemTitle: 'Total Corners: O/U 8.5',
            line: 8.5,
            volume: 1000,
            tokens: [
              createToken({ id: 'corners-over-85' }),
              createToken({ id: 'corners-under-85' }),
            ],
          }),
          createOutcome({
            id: 'corners-95',
            sportsMarketType: 'total_corners',
            groupItemTitle: 'Total Corners: O/U 9.5',
            line: 9.5,
            volume: 5000,
            tokens: [
              createToken({ id: 'corners-over-95' }),
              createToken({ id: 'corners-under-95' }),
            ],
          }),
        ],
      }),
      createCard({
        key: 'duplicate-token-card',
        title: 'Duplicate Token Card',
        outcomes: [
          createOutcome({
            id: 'duplicate-token-outcome',
            sportsMarketType: 'soccer_player_goals',
            groupItemTitle: 'Duplicate Token Outcome',
            tokens: [
              createToken({ id: 'player-over', shortTitle: 'Over Again' }),
              createToken({ id: 'player-under', shortTitle: 'Under Again' }),
            ],
          }),
        ],
      }),
    ]);

    const { result } = renderHook(() => usePredictGameGroupOutcomes({ group }));

    expect(result.current.openCardModels).toEqual([
      expect.objectContaining({
        kind: 'moneyline',
        key: 'moneyline',
        title: 'Moneyline',
        testID: 'game_lines-moneyline',
      }),
      expect.objectContaining({
        kind: 'simple',
        key: 'player-goals',
        title: 'Player One',
        testID: 'game_lines-soccer_player_goals-0',
      }),
      expect.objectContaining({
        kind: 'line',
        key: 'total_corners',
        title: 'Corners',
        testID: 'game_lines-total_corners',
      }),
      expect.objectContaining({
        kind: 'simple',
        key: 'duplicate-token-outcome',
        title: 'Duplicate Token Card',
        testID: 'game_lines-duplicate-token-card',
      }),
    ]);
  });

  it('keeps memoized references stable when the same group instance is rerendered', () => {
    const group = createGroup('game_lines', [
      createCard({
        key: 'total_corners',
        outcomes: [
          createOutcome({
            id: 'corners-95',
            sportsMarketType: 'total_corners',
            groupItemTitle: 'Total Corners: O/U 9.5',
            line: 9.5,
            tokens: [
              createToken({ id: 'corners-over-95' }),
              createToken({ id: 'corners-under-95' }),
            ],
          }),
        ],
      }),
    ]);

    const { result, rerender } = renderHook(
      ({ currentGroup }) =>
        usePredictGameGroupOutcomes({ group: currentGroup }),
      { initialProps: { currentGroup: group } },
    );

    const firstCardModels = result.current.openCardModels;

    rerender({ currentGroup: group });

    expect(result.current.openCardModels).toBe(firstCardModels);
  });

  it('recomputes derived values when the group changes', () => {
    const firstGroup = createGroup('game_lines', [
      createCard({
        key: 'moneyline',
        outcomes: [
          createOutcome({
            id: 'moneyline-home',
            sportsMarketType: 'moneyline',
            tokens: [createToken({ id: 'ml-home', price: 0.6 })],
          }),
          createOutcome({
            id: 'moneyline-away',
            sportsMarketType: 'moneyline',
            tokens: [createToken({ id: 'ml-away', price: 0.4 })],
          }),
        ],
      }),
    ]);
    const secondGroup = createGroup('corners', [
      createCard({
        key: 'total_corners',
        outcomes: [
          createOutcome({
            id: 'corners-85',
            sportsMarketType: 'total_corners',
            groupItemTitle: 'Total Corners: O/U 8.5',
            line: 8.5,
            tokens: [
              createToken({ id: 'corners-over-85' }),
              createToken({ id: 'corners-under-85' }),
            ],
          }),
          createOutcome({
            id: 'corners-95',
            sportsMarketType: 'total_corners',
            groupItemTitle: 'Total Corners: O/U 9.5',
            line: 9.5,
            tokens: [
              createToken({ id: 'corners-over-95' }),
              createToken({ id: 'corners-under-95' }),
            ],
          }),
        ],
      }),
    ]);

    const { result, rerender } = renderHook(
      ({ currentGroup }) =>
        usePredictGameGroupOutcomes({ group: currentGroup }),
      { initialProps: { currentGroup: firstGroup } },
    );

    rerender({ currentGroup: secondGroup });

    expect(result.current.openCardModels).toEqual([
      expect.objectContaining({
        kind: 'line',
        key: 'total_corners',
        title: 'Corners',
        testID: 'corners-total_corners',
      }),
    ]);
  });
});

describe('buildOutcomeCardModels', () => {
  it('builds card models directly from a group', () => {
    const group = createGroup('game_lines', [
      createCard({
        key: 'moneyline',
        outcomes: [
          createOutcome({
            id: 'moneyline-home',
            sportsMarketType: 'moneyline',
            tokens: [createToken({ id: 'ml-home', price: 0.6 })],
          }),
          createOutcome({
            id: 'moneyline-away',
            sportsMarketType: 'moneyline',
            tokens: [createToken({ id: 'ml-away', price: 0.4 })],
          }),
        ],
      }),
    ]);

    expect(buildOutcomeCardModels(group)).toEqual([
      expect.objectContaining({
        kind: 'moneyline',
        key: 'moneyline',
      }),
    ]);
  });
});
