import { useMemo } from 'react';
import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../../types';

interface UseOutcomeResolutionParams {
  market: PredictMarket | null;
}

interface UseOutcomeResolutionResult {
  winningOutcomeToken: PredictOutcomeToken | undefined;
  losingOutcomeToken: PredictOutcomeToken | undefined;
  resolutionStatus: string | undefined;
  winningOutcome: PredictOutcome | undefined;
  losingOutcome: PredictOutcome | undefined;
  outcomeSlices: PredictOutcome[];
  outcomeTokenIds: (string | undefined)[];
  loadedOutcomeTokenIds: string[];
  hasAnyOutcomeToken: boolean;
  multipleOutcomes: boolean;
  singleOutcomeMarket: boolean;
  multipleOpenOutcomesPartiallyResolved: boolean;
}

export const useOutcomeResolution = ({
  market,
}: UseOutcomeResolutionParams): UseOutcomeResolutionResult => {
  const { winningOutcomeToken, losingOutcomeToken, resolutionStatus } =
    useMemo(() => {
      // early return if no market or outcomes
      if (!market?.outcomes?.length) {
        return {
          winningOutcomeToken: undefined,
          losingOutcomeToken: undefined,
          resolutionStatus: undefined,
        };
      }

      let winningToken: PredictOutcomeToken | undefined;
      let losingToken: PredictOutcomeToken | undefined;
      let winningOutcome: PredictOutcome | undefined;

      // single iteration through outcomes to find winning/losing tokens and outcome
      for (const outcome of market.outcomes) {
        if (!outcome.tokens?.length) continue;

        for (const token of outcome.tokens) {
          if (token.price === 1 && !winningToken) {
            winningToken = token;
            winningOutcome = outcome;
          } else if (token.price === 0 && !losingToken) {
            losingToken = token;
          }
        }

        // early exit if we found both tokens
        if (winningToken && losingToken) break;
      }

      return {
        winningOutcomeToken: winningToken,
        losingOutcomeToken: losingToken,
        resolutionStatus: winningOutcome?.resolutionStatus,
      };
    }, [market]);

  // Determine the winning outcome (the outcome that contains the winning token)
  const winningOutcome = useMemo(
    () =>
      winningOutcomeToken
        ? market?.outcomes.find((outcome) =>
            outcome.tokens.some((token) => token.id === winningOutcomeToken.id),
          )
        : undefined,
    [market?.outcomes, winningOutcomeToken],
  );

  const losingOutcome = useMemo(
    () =>
      losingOutcomeToken
        ? market?.outcomes.find((outcome) =>
            outcome.tokens.some((token) => token.id === losingOutcomeToken.id),
          )
        : undefined,
    [market?.outcomes, losingOutcomeToken],
  );

  const outcomeSlices = useMemo(
    () => (market?.outcomes ?? []).slice(0, 3),
    [market?.outcomes],
  );

  const outcomeTokenIds = useMemo(
    () =>
      [0, 1, 2].map(
        (index) => outcomeSlices[index]?.tokens?.[0]?.id ?? undefined,
      ),
    [outcomeSlices],
  );

  const loadedOutcomeTokenIds = useMemo(
    () =>
      outcomeTokenIds.filter((tokenId): tokenId is string => Boolean(tokenId)),
    [outcomeTokenIds],
  );

  const hasAnyOutcomeToken = loadedOutcomeTokenIds.length > 0;
  const multipleOutcomes = loadedOutcomeTokenIds.length > 1;
  const singleOutcomeMarket = loadedOutcomeTokenIds.length === 1;
  const multipleOpenOutcomesPartiallyResolved =
    loadedOutcomeTokenIds.length > 1 &&
    !!market?.outcomes?.some(
      (outcome) => outcome.resolutionStatus === 'resolved',
    );

  return {
    winningOutcomeToken,
    losingOutcomeToken,
    resolutionStatus,
    winningOutcome,
    losingOutcome,
    outcomeSlices,
    outcomeTokenIds,
    loadedOutcomeTokenIds,
    hasAnyOutcomeToken,
    multipleOutcomes,
    singleOutcomeMarket,
    multipleOpenOutcomesPartiallyResolved,
  };
};
