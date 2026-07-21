import { renderHook } from '@testing-library/react-native';
import type {
  GetPriceResponse,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
} from '../../types';
import { usePricedOutcomeGroup } from './usePricedOutcomeGroup';

const mockUsePredictPreviewSheet = jest.fn(() => ({
  isBuySheetOpen: false,
}));

jest.mock('../../contexts', () => ({
  usePredictPreviewSheet: () => mockUsePredictPreviewSheet(),
}));

const mockUsePredictPrices = jest.fn();

jest.mock('../../hooks/usePredictPrices', () => ({
  usePredictPrices: (options: unknown) => mockUsePredictPrices(options),
}));

const emptyPriceResponse: GetPriceResponse = {
  providerId: '',
  results: [],
};

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
    sportsMarketType: 'points',
    tokens: [createToken({ id: 'tok-points', price: 0.65 })],
    ...overrides,
  }) as PredictOutcome;

const createGroup = (
  overrides: Partial<PredictOutcomeGroup> = {},
): PredictOutcomeGroup => ({
  key: 'points',
  outcomes: [createOutcome()],
  ...overrides,
});

describe('usePricedOutcomeGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictPreviewSheet.mockReturnValue({ isBuySheetOpen: false });
    mockUsePredictPrices.mockReturnValue({
      prices: emptyPriceResponse,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('does not fetch prices while the buy sheet is open', () => {
    mockUsePredictPreviewSheet.mockReturnValue({ isBuySheetOpen: true });
    const group = createGroup();

    renderHook(() => usePricedOutcomeGroup(group));

    expect(mockUsePredictPrices).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        queries: [],
      }),
    );
  });

  it('applies ask (buy) prices to pollable group outcomes', () => {
    const group = createGroup({
      key: 'points',
      outcomes: [
        createOutcome({
          id: 'o-points',
          sportsMarketType: 'points',
          tokens: [createToken({ id: 'tok-points', price: 0.65 })],
        }),
      ],
    });
    mockUsePredictPrices.mockReturnValue({
      prices: {
        providerId: 'polymarket',
        results: [
          {
            marketId: 'market-1',
            outcomeId: 'o-points',
            outcomeTokenId: 'tok-points',
            entry: { buy: 0.71, sell: 0.72 },
          },
        ],
      },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePricedOutcomeGroup(group));

    expect(mockUsePredictPrices).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        queries: [
          {
            marketId: 'market-1',
            outcomeId: 'o-points',
            outcomeTokenId: 'tok-points',
          },
        ],
      }),
    );
    expect(result.current?.outcomes[0].tokens[0].price).toBe(0.71);
  });

  it('re-targets price queries when selected group changes', () => {
    const pointsGroup = createGroup({
      key: 'points',
      outcomes: [
        createOutcome({
          id: 'o-points',
          sportsMarketType: 'points',
          tokens: [createToken({ id: 'tok-points', price: 0.65 })],
        }),
      ],
    });
    const touchdownsGroup = createGroup({
      key: 'touchdowns',
      outcomes: [
        createOutcome({
          id: 'o-td',
          sportsMarketType: 'touchdowns',
          tokens: [createToken({ id: 'tok-td', price: 0.4 })],
        }),
      ],
    });

    const { rerender } = renderHook(
      ({ group }: { group: PredictOutcomeGroup | undefined }) =>
        usePricedOutcomeGroup(group),
      { initialProps: { group: pointsGroup } },
    );

    expect(mockUsePredictPrices).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queries: [
          {
            marketId: 'market-1',
            outcomeId: 'o-points',
            outcomeTokenId: 'tok-points',
          },
        ],
      }),
    );

    rerender({ group: touchdownsGroup });

    expect(mockUsePredictPrices).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queries: [
          {
            marketId: 'market-1',
            outcomeId: 'o-td',
            outcomeTokenId: 'tok-td',
          },
        ],
      }),
    );
  });

  it('polls spread subgroup outcomes but excludes moneyline subgroups', () => {
    const group = createGroup({
      key: 'game_lines',
      outcomes: [],
      subgroups: [
        createGroup({
          key: 'spreads',
          outcomes: [
            createOutcome({
              id: 'sp-1',
              sportsMarketType: 'spreads',
              line: 3.5,
              tokens: [
                createToken({ id: 'tok-sp-a', shortTitle: 'TA', price: 0.6 }),
                createToken({ id: 'tok-sp-b', shortTitle: 'TB', price: 0.4 }),
              ],
            }),
          ],
        }),
        createGroup({
          key: 'moneyline',
          outcomes: [
            createOutcome({
              id: 'ml-home',
              sportsMarketType: 'moneyline',
              tokens: [
                createToken({
                  id: 'tok-ml-home',
                  shortTitle: 'TA',
                  price: 0.6,
                }),
              ],
            }),
            createOutcome({
              id: 'ml-away',
              sportsMarketType: 'moneyline',
              tokens: [
                createToken({
                  id: 'tok-ml-away',
                  shortTitle: 'TB',
                  price: 0.4,
                }),
              ],
            }),
          ],
        }),
      ],
    });
    mockUsePredictPrices.mockReturnValue({
      prices: {
        providerId: 'polymarket',
        results: [
          {
            marketId: 'market-1',
            outcomeId: 'sp-1',
            outcomeTokenId: 'tok-sp-a',
            entry: { buy: 0.67, sell: 0.68 },
          },
          {
            marketId: 'market-1',
            outcomeId: 'sp-1',
            outcomeTokenId: 'tok-sp-b',
            entry: { buy: 0.31, sell: 0.32 },
          },
        ],
      },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePricedOutcomeGroup(group));

    expect(mockUsePredictPrices).toHaveBeenCalledWith(
      expect.objectContaining({
        queries: [
          {
            marketId: 'market-1',
            outcomeId: 'sp-1',
            outcomeTokenId: 'tok-sp-a',
          },
          {
            marketId: 'market-1',
            outcomeId: 'sp-1',
            outcomeTokenId: 'tok-sp-b',
          },
        ],
      }),
    );
    expect(result.current?.subgroups?.[0].outcomes[0].tokens[0].price).toBe(
      0.67,
    );
    expect(result.current?.subgroups?.[0].outcomes[0].tokens[1].price).toBe(
      0.31,
    );
    expect(result.current?.subgroups?.[1].outcomes[0].tokens[0].price).toBe(
      0.6,
    );
  });
});
