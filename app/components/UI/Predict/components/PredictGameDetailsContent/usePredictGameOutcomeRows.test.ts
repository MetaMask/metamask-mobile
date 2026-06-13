import { renderHook } from '@testing-library/react-hooks';
import type {
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import Logger from '../../../../../util/Logger';
import { usePredictGameOutcomeRows } from './usePredictGameOutcomeRows';

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

describe('usePredictGameOutcomeRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty arrays when no group is provided', () => {
    const { result } = renderHook(() => usePredictGameOutcomeRows(undefined));

    expect(result.current.cardModels).toEqual([]);
    expect(result.current.activeGroupTokenIds).toEqual([]);
  });

  it('builds card models and de-duplicated token ids for subgrouped outcomes', () => {
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

    const { result } = renderHook(() => usePredictGameOutcomeRows(group));

    expect(result.current.cardModels).toEqual([
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

    expect(result.current.activeGroupTokenIds).toEqual([
      'ml-home',
      'ml-away',
      'player-over',
      'player-under',
      'corners-over-85',
      'corners-under-85',
      'corners-over-95',
      'corners-under-95',
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
      ({ currentGroup }) => usePredictGameOutcomeRows(currentGroup),
      { initialProps: { currentGroup: group } },
    );

    const firstCardModels = result.current.cardModels;
    const firstTokenIds = result.current.activeGroupTokenIds;

    rerender({ currentGroup: group });

    expect(result.current.cardModels).toBe(firstCardModels);
    expect(result.current.activeGroupTokenIds).toBe(firstTokenIds);
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
      ({ currentGroup }) => usePredictGameOutcomeRows(currentGroup),
      { initialProps: { currentGroup: firstGroup } },
    );

    rerender({ currentGroup: secondGroup });

    expect(result.current.cardModels).toEqual([
      expect.objectContaining({
        kind: 'line',
        key: 'total_corners',
        title: 'Corners',
        testID: 'corners-total_corners',
      }),
    ]);
    expect(result.current.activeGroupTokenIds).toEqual([
      'corners-over-85',
      'corners-under-85',
      'corners-over-95',
      'corners-under-95',
    ]);
  });
});
