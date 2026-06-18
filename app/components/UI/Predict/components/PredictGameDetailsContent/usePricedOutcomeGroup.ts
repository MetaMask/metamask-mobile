import { useEffect, useMemo, useRef } from 'react';
import type {
  GetPriceResponse,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PriceQuery,
} from '../../types';
import { usePredictPrices } from '../../hooks/usePredictPrices';
import { isMoneylineLikeMarketType } from '../../constants/sports';
import { usePredictPreviewSheet } from '../../contexts';
import { isValidPrice } from '../../utils/prices';

const PRICE_POLL_INTERVAL_MS = 2000;
const EMPTY_PRICE_QUERIES: PriceQuery[] = [];

const flattenGroupOutcomes = (group: PredictOutcomeGroup): PredictOutcome[] => [
  ...group.outcomes,
  ...(group.subgroups?.flatMap((subgroup) => subgroup.outcomes) ?? []),
];

const shouldPollOutcomePrices = (
  outcome: PredictOutcome,
  groupKey?: string,
): boolean => !isMoneylineLikeMarketType(groupKey ?? outcome.sportsMarketType);

const getPollableOutcomes = (group: PredictOutcomeGroup): PredictOutcome[] => {
  const groupOutcomes = group.outcomes.filter((outcome) =>
    shouldPollOutcomePrices(outcome),
  );
  const subgroupOutcomes =
    group.subgroups?.flatMap((subgroup) =>
      isMoneylineLikeMarketType(subgroup.key)
        ? []
        : subgroup.outcomes.filter((outcome) =>
            shouldPollOutcomePrices(outcome, subgroup.key),
          ),
    ) ?? [];

  return [...groupOutcomes, ...subgroupOutcomes];
};

const buildPriceQueries = (outcomes: PredictOutcome[]): PriceQuery[] =>
  outcomes.flatMap((outcome) =>
    outcome.tokens.map((token) => ({
      marketId: outcome.marketId,
      outcomeId: outcome.id,
      outcomeTokenId: token.id,
    })),
  );

const buildPriceResultsByTokenId = (
  prices: GetPriceResponse,
): Map<string, GetPriceResponse['results'][number]> =>
  new Map(prices.results.map((result) => [result.outcomeTokenId, result]));

const getRestAskPriceForBuyButton = (
  token: PredictOutcomeToken,
  pricesByTokenId: Map<string, GetPriceResponse['results'][number]>,
): number => {
  const restEntry = pricesByTokenId.get(token.id);
  return isValidPrice(restEntry?.entry.sell)
    ? restEntry.entry.sell
    : token.price;
};

const applyPricesToOutcomes = (
  outcomes: PredictOutcome[],
  pricesByTokenId: Map<string, GetPriceResponse['results'][number]>,
  shouldApplyPrices: (outcome: PredictOutcome) => boolean,
  previousById?: Map<string, PredictOutcome>,
): { outcomes: PredictOutcome[]; changed: boolean } => {
  let changed = false;
  const nextOutcomes = outcomes.map((outcome) => {
    if (!shouldApplyPrices(outcome)) {
      return outcome;
    }

    const previousOutcome = previousById?.get(outcome.id);
    let outcomeChanged = !previousOutcome;

    const tokens = outcome.tokens.map((token) => {
      const price = getRestAskPriceForBuyButton(token, pricesByTokenId);
      const previousToken = previousOutcome?.tokens.find(
        (t) => t.id === token.id,
      );
      if (previousToken && previousToken.price === price) {
        return previousToken;
      }
      outcomeChanged = true;
      return { ...token, price };
    });

    if (previousOutcome && !outcomeChanged) {
      changed = changed || previousOutcome !== outcome;
      return previousOutcome;
    }

    changed = true;
    return { ...outcome, tokens };
  });

  return { outcomes: changed ? nextOutcomes : outcomes, changed };
};

const applyPricesToGroup = (
  group: PredictOutcomeGroup,
  prices: GetPriceResponse,
  previousGroup: PredictOutcomeGroup | null,
  previousPricedOutcomes: PredictOutcome[],
): PredictOutcomeGroup => {
  const canReusePreviousPrices = previousGroup === group;
  const previousById = canReusePreviousPrices
    ? new Map(previousPricedOutcomes.map((outcome) => [outcome.id, outcome]))
    : undefined;
  const pricesByTokenId = buildPriceResultsByTokenId(prices);

  const pricedOutcomes = applyPricesToOutcomes(
    group.outcomes,
    pricesByTokenId,
    (outcome) => shouldPollOutcomePrices(outcome),
    previousById,
  );

  let subgroupChanged = false;
  const pricedSubgroups = group.subgroups?.map((subgroup) => {
    if (isMoneylineLikeMarketType(subgroup.key)) {
      return subgroup;
    }

    const result = applyPricesToOutcomes(
      subgroup.outcomes,
      pricesByTokenId,
      (outcome) => shouldPollOutcomePrices(outcome, subgroup.key),
      previousById,
    );

    if (!result.changed) {
      return subgroup;
    }

    subgroupChanged = true;
    return { ...subgroup, outcomes: result.outcomes };
  });

  if (!pricedOutcomes.changed && !subgroupChanged) {
    return group;
  }

  return {
    ...group,
    outcomes: pricedOutcomes.outcomes,
    ...(pricedSubgroups && { subgroups: pricedSubgroups }),
  };
};

export const usePricedOutcomeGroup = (
  selectedGroup?: PredictOutcomeGroup,
): PredictOutcomeGroup | undefined => {
  const { isBuySheetOpen } = usePredictPreviewSheet();

  const pollableOutcomes = useMemo(
    () => (selectedGroup ? getPollableOutcomes(selectedGroup) : []),
    [selectedGroup],
  );

  const priceQueries = useMemo(
    () => buildPriceQueries(pollableOutcomes),
    [pollableOutcomes],
  );

  const shouldFetchPrices = priceQueries.length > 0 && !isBuySheetOpen;
  const activePriceQueries = shouldFetchPrices
    ? priceQueries
    : EMPTY_PRICE_QUERIES;

  const { prices } = usePredictPrices({
    queries: activePriceQueries,
    enabled: shouldFetchPrices,
    pollingInterval: shouldFetchPrices ? PRICE_POLL_INTERVAL_MS : undefined,
  });

  const previousSelectedGroupRef = useRef<PredictOutcomeGroup | null>(null);
  const previousPricedOutcomesRef = useRef<PredictOutcome[]>([]);

  const pricedGroup = useMemo(() => {
    if (!selectedGroup) {
      return undefined;
    }

    return applyPricesToGroup(
      selectedGroup,
      prices,
      previousSelectedGroupRef.current,
      previousPricedOutcomesRef.current,
    );
  }, [selectedGroup, prices]);

  useEffect(() => {
    if (!selectedGroup || !pricedGroup) {
      previousSelectedGroupRef.current = null;
      previousPricedOutcomesRef.current = [];
      return;
    }

    previousSelectedGroupRef.current = selectedGroup;
    previousPricedOutcomesRef.current = flattenGroupOutcomes(pricedGroup);
  }, [selectedGroup, pricedGroup]);

  return pricedGroup;
};
