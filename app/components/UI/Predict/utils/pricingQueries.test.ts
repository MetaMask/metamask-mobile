import type { PredictOutcome, PredictOutcomeToken } from '../types';
import {
  buildPriceQueriesFromOutcome,
  buildPriceQueriesFromOutcomes,
  buildVisibleOutcomePricingInput,
  collectOutcomeTokens,
} from './pricingQueries';

const createToken = (
  overrides: Partial<PredictOutcomeToken> = {},
): PredictOutcomeToken =>
  ({
    id: 'token-1',
    title: 'Yes',
    price: 0.5,
    ...overrides,
  }) as PredictOutcomeToken;

const createOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome =>
  ({
    id: 'outcome-1',
    marketId: 'market-1',
    providerId: 'polymarket',
    title: 'Outcome',
    status: 'open',
    volume: 100,
    tokens: [
      createToken({ id: 'token-yes', title: 'Yes' }),
      createToken({ id: 'token-no', title: 'No' }),
    ],
    ...overrides,
  }) as PredictOutcome;

describe('pricingQueries', () => {
  it('builds price queries for every token in an outcome', () => {
    expect(buildPriceQueriesFromOutcome(createOutcome())).toEqual([
      {
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-yes',
      },
      {
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-no',
      },
    ]);
  });

  it('builds queries and collects tokens across multiple outcomes', () => {
    const firstOutcome = createOutcome({ id: 'outcome-1' });
    const secondOutcome = createOutcome({
      id: 'outcome-2',
      tokens: [createToken({ id: 'token-draw', title: 'Draw' })],
    });

    expect(
      buildPriceQueriesFromOutcomes([firstOutcome, secondOutcome]),
    ).toEqual([
      {
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-yes',
      },
      {
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-no',
      },
      {
        marketId: 'market-1',
        outcomeId: 'outcome-2',
        outcomeTokenId: 'token-draw',
      },
    ]);
    expect(
      collectOutcomeTokens([firstOutcome, secondOutcome]).map(({ id }) => id),
    ).toEqual(['token-yes', 'token-no', 'token-draw']);
  });

  it('builds visible pricing input and dedupes by token id', () => {
    const visibleOutcome = createOutcome({
      id: 'visible-outcome',
      tokens: [
        createToken({ id: 'shared-token', title: 'Shared' }),
        createToken({ id: 'visible-only', title: 'Visible' }),
      ],
    });
    const hiddenOutcome = createOutcome({
      id: 'hidden-outcome',
      tokens: [
        createToken({ id: 'shared-token', title: 'Hidden Shared' }),
        createToken({ id: 'hidden-only', title: 'Hidden' }),
      ],
    });

    const pricingInput = buildVisibleOutcomePricingInput({
      items: [
        { key: 'visible', outcomes: [visibleOutcome] },
        { key: 'hidden', outcomes: [hiddenOutcome] },
      ],
      visibleKeys: new Set(['visible']),
      getItemKey: (item) => item.key,
      getOutcomes: (item) => item.outcomes,
    });

    expect(pricingInput.tokens.map(({ id }) => id)).toEqual([
      'shared-token',
      'visible-only',
    ]);
    expect(
      pricingInput.queries.map(({ outcomeTokenId }) => outcomeTokenId),
    ).toEqual(['shared-token', 'visible-only']);
  });
});
