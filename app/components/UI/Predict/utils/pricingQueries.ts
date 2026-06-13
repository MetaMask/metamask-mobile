import type { PredictOutcome, PredictOutcomeToken, PriceQuery } from '../types';

export interface OutcomePricingInput {
  queries: PriceQuery[];
  tokens: PredictOutcomeToken[];
}

export const buildPriceQueriesFromOutcome = (
  outcome: PredictOutcome,
): PriceQuery[] =>
  outcome.tokens.map((token) => ({
    marketId: outcome.marketId,
    outcomeId: outcome.id,
    outcomeTokenId: token.id,
  }));

export const buildPriceQueriesFromOutcomes = (
  outcomes: PredictOutcome[],
): PriceQuery[] => outcomes.flatMap(buildPriceQueriesFromOutcome);

export const collectOutcomeTokens = (
  outcomes: PredictOutcome[],
): PredictOutcomeToken[] => outcomes.flatMap((outcome) => outcome.tokens);

export const buildVisibleOutcomePricingInput = <TItem>({
  items,
  visibleKeys,
  getItemKey,
  getOutcomes,
}: {
  items: TItem[];
  visibleKeys: Set<string>;
  getItemKey: (item: TItem) => string;
  getOutcomes: (item: TItem) => PredictOutcome[];
}): OutcomePricingInput => {
  const queriesByTokenId = new Map<string, PriceQuery>();
  const tokensById = new Map<string, PredictOutcomeToken>();

  items.forEach((item) => {
    if (!visibleKeys.has(getItemKey(item))) {
      return;
    }

    getOutcomes(item).forEach((outcome) => {
      outcome.tokens.forEach((token) => {
        tokensById.set(token.id, token);
      });

      buildPriceQueriesFromOutcome(outcome).forEach((query) => {
        queriesByTokenId.set(query.outcomeTokenId, query);
      });
    });
  });

  return {
    queries: [...queriesByTokenId.values()],
    tokens: [...tokensById.values()],
  };
};
