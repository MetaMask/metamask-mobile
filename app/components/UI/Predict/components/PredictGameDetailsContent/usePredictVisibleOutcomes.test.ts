import { act, renderHook } from '@testing-library/react-native';
import type { PredictOutcome } from '../../types';
import type { OutcomeCardModel } from './outcomeCardModel';
import {
  PREDICT_OUTCOME_VIEWABILITY_CONFIG,
  resolveVisibleOutcomePriceQueries,
  usePredictVisibleOutcomes,
} from './usePredictVisibleOutcomes';

type TestListItem =
  | {
      type: 'header';
      key: string;
    }
  | {
      type: 'outcome-card';
      key: string;
      cardModel: OutcomeCardModel;
    };

const createOutcome = (
  id: string,
  tokenIds: string[],
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id,
    providerId: 'polymarket',
    marketId: `market-${id}`,
    title: id,
    description: '',
    image: '',
    status: 'open',
    tokens: tokenIds.map((tokenId) => ({
      id: tokenId,
      title: tokenId,
      price: 0.5,
    })),
    volume: 1000,
    groupItemTitle: id,
    ...overrides,
  }) as PredictOutcome;

const createSimpleCard = (
  key: string,
  tokenIds: string[],
): OutcomeCardModel => {
  const outcome = createOutcome(`outcome-${key}`, tokenIds);

  return {
    kind: 'simple',
    key,
    title: key,
    testID: key,
    outcome,
  };
};

const createMoneylineCard = (): OutcomeCardModel => ({
  kind: 'moneyline',
  key: 'moneyline-card',
  title: 'Moneyline',
  testID: 'moneyline-card',
  outcomes: [
    createOutcome('home', ['home-yes', 'home-no']),
    createOutcome('draw', ['draw-yes', 'draw-no']),
    createOutcome('away', ['away-yes', 'away-no']),
  ],
});

const createLineCard = (): OutcomeCardModel => ({
  kind: 'line',
  key: 'line-card',
  title: 'Line',
  testID: 'line-card',
  sportsMarketType: 'total_corners',
  outcomes: [
    createOutcome('line-95', ['over-95', 'under-95'], {
      line: 9.5,
      volume: 5000,
    }),
    createOutcome('line-85', ['over-85', 'under-85'], {
      line: 8.5,
      volume: 1000,
    }),
  ],
});

const createOutcomeItem = (cardModel: OutcomeCardModel): TestListItem => ({
  type: 'outcome-card',
  key: `item-${cardModel.key}`,
  cardModel,
});

const createHeaderItem = (): TestListItem => ({
  type: 'header',
  key: 'header',
});

const getVisibleCardKey = (item: TestListItem): string | undefined =>
  item.type === 'outcome-card' ? item.cardModel.key : undefined;

const settleVisibility = () => {
  act(() => {
    jest.advanceTimersByTime(200);
  });
};

describe('resolveVisibleOutcomePriceQueries', () => {
  it('returns simple card queries for all rendered outcome tokens', () => {
    const simpleCard = createSimpleCard('simple-card', [
      'simple-yes',
      'simple-no',
    ]);

    const result = resolveVisibleOutcomePriceQueries({
      cardModels: [simpleCard],
      selectedLineIndices: {},
      visibleCardKeys: new Set(['simple-card']),
    });

    expect(result).toEqual([
      {
        marketId: 'market-outcome-simple-card',
        outcomeId: 'outcome-simple-card',
        outcomeTokenId: 'simple-yes',
      },
      {
        marketId: 'market-outcome-simple-card',
        outcomeId: 'outcome-simple-card',
        outcomeTokenId: 'simple-no',
      },
    ]);
  });

  it('returns moneyline queries for rendered yes tokens only', () => {
    const moneylineCard = createMoneylineCard();

    const result = resolveVisibleOutcomePriceQueries({
      cardModels: [moneylineCard],
      selectedLineIndices: {},
      visibleCardKeys: new Set(['moneyline-card']),
    });

    expect(result.map((query) => query.outcomeTokenId)).toEqual([
      'home-yes',
      'draw-yes',
      'away-yes',
    ]);
  });

  it('returns default selected line queries from the highest-volume line', () => {
    const lineCard = createLineCard();

    const result = resolveVisibleOutcomePriceQueries({
      cardModels: [lineCard],
      selectedLineIndices: {},
      visibleCardKeys: new Set(['line-card']),
    });

    expect(result.map((query) => query.outcomeTokenId)).toEqual([
      'over-95',
      'under-95',
    ]);
  });

  it('returns selected line queries when line index is set', () => {
    const lineCard = createLineCard();

    const result = resolveVisibleOutcomePriceQueries({
      cardModels: [lineCard],
      selectedLineIndices: {
        'line-card': 0,
      },
      visibleCardKeys: new Set(['line-card']),
    });

    expect(result.map((query) => query.outcomeTokenId)).toEqual([
      'over-85',
      'under-85',
    ]);
  });

  it('deduplicates queries by outcome token ID', () => {
    const firstCard = createSimpleCard('first-card', ['shared-token']);
    const secondCard = createSimpleCard('second-card', ['shared-token']);

    const result = resolveVisibleOutcomePriceQueries({
      cardModels: [firstCard, secondCard],
      selectedLineIndices: {},
      visibleCardKeys: new Set(['first-card', 'second-card']),
    });

    expect(result).toHaveLength(1);
    expect(result[0].outcomeTokenId).toBe('shared-token');
  });
});

describe('usePredictVisibleOutcomes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns configured FlashList viewability thresholds', () => {
    const simpleCard = createSimpleCard('simple-card', ['simple-token']);

    const { result } = renderHook(() =>
      usePredictVisibleOutcomes<TestListItem>({
        cardModels: [simpleCard],
        getVisibleCardKey,
      }),
    );

    expect(result.current.viewabilityConfig).toBe(
      PREDICT_OUTCOME_VIEWABILITY_CONFIG,
    );
  });

  it('settles visible card token IDs after the visibility delay', () => {
    const visibleCard = createSimpleCard('visible-card', ['visible-token']);
    const hiddenCard = createSimpleCard('hidden-card', ['hidden-token']);
    const { result } = renderHook(() =>
      usePredictVisibleOutcomes<TestListItem>({
        cardModels: [visibleCard, hiddenCard],
        getVisibleCardKey,
      }),
    );

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [
          { item: createHeaderItem() },
          { item: createOutcomeItem(visibleCard) },
        ],
      });
    });

    expect(result.current.visibleTokenIds).toEqual([]);

    settleVisibility();

    expect(result.current.visibleTokenIds).toEqual(['visible-token']);
    expect(result.current.visibleCardKeys).toEqual(new Set(['visible-card']));
  });

  it('updates visible line queries when selected line changes', () => {
    const lineCard = createLineCard();
    const { result } = renderHook(() =>
      usePredictVisibleOutcomes<TestListItem>({
        cardModels: [lineCard],
        getVisibleCardKey,
      }),
    );
    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: createOutcomeItem(lineCard) }],
      });
    });
    settleVisibility();

    act(() => {
      result.current.onSelectedLineIndexChange('line-card', 0);
    });

    expect(result.current.selectedLineIndices).toEqual({
      'line-card': 0,
    });
    expect(result.current.visibleTokenIds).toEqual(['over-85', 'under-85']);
  });

  it('clears visibility and selected lines when reset key changes', () => {
    const lineCard = createLineCard();
    const { result, rerender } = renderHook(
      ({ resetKey }) =>
        usePredictVisibleOutcomes<TestListItem>({
          cardModels: [lineCard],
          getVisibleCardKey,
          resetKey,
        }),
      { initialProps: { resetKey: 'outcomes:game-lines' } },
    );
    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: createOutcomeItem(lineCard) }],
      });
    });
    settleVisibility();
    act(() => {
      result.current.onSelectedLineIndexChange('line-card', 0);
    });

    rerender({ resetKey: 'positions:game-lines' });

    expect(result.current.visibleTokenIds).toEqual([]);
    expect(result.current.visibleCardKeys).toEqual(new Set());
    expect(result.current.selectedLineIndices).toEqual({});
  });

  it('commits next viewability update immediately after reset key changes', () => {
    const simpleCard = createSimpleCard('simple-card', ['simple-token']);
    const { result, rerender } = renderHook(
      ({ resetKey }) =>
        usePredictVisibleOutcomes<TestListItem>({
          cardModels: [simpleCard],
          getVisibleCardKey,
          resetKey,
        }),
      { initialProps: { resetKey: 'outcomes:game-lines' } },
    );

    rerender({ resetKey: 'outcomes:props' });
    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: createOutcomeItem(simpleCard) }],
      });
    });

    expect(result.current.visibleTokenIds).toEqual(['simple-token']);
  });

  it('clears visible token IDs when disabled', () => {
    const simpleCard = createSimpleCard('simple-card', ['simple-token']);
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        usePredictVisibleOutcomes<TestListItem>({
          cardModels: [simpleCard],
          enabled,
          getVisibleCardKey,
        }),
      { initialProps: { enabled: true } },
    );
    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: createOutcomeItem(simpleCard) }],
      });
    });
    settleVisibility();

    rerender({ enabled: false });

    expect(result.current.visibleTokenIds).toEqual([]);
    expect(result.current.visibleCardKeys).toEqual(new Set());
  });
});
