import {
  PredictEventValues,
  type PredictMarketVersionValue,
} from '../constants/eventNames';
import { V2_MARKET_VERSION } from '../providers/polymarket/constants';
import type { PredictOutcome, PredictPosition } from '../types';

/**
 * True only for an outcome of a Gamma `version: "v2"` (Protocol V2) market.
 * Any other version — "v1", missing, or unknown — is a CTF market.
 */
export const isPolymarketV2Outcome = (
  outcome?: Pick<PredictOutcome, 'version'>,
): boolean => outcome?.version === V2_MARKET_VERSION;

/**
 * The `market_version` analytics value of a traded outcome: `v2` for a
 * Protocol V2 market, `v1` for any other version (the same rule as order
 * routing). Undefined when the outcome is not known.
 */
export const getPredictMarketVersion = (
  outcome?: Pick<PredictOutcome, 'version'>,
): PredictMarketVersionValue | undefined => {
  if (!outcome) {
    return undefined;
  }

  return isPolymarketV2Outcome(outcome)
    ? PredictEventValues.MARKET_VERSION.V2
    : PredictEventValues.MARKET_VERSION.V1;
};

/**
 * The `market_version` analytics value of a claim: `v1` or `v2` when every
 * claimed position has that version, `mixed` when the claim pays out both.
 * `marketVersions` is keyed by outcome id; a missing entry is a CTF position.
 * Undefined when the versions or the positions are not known.
 */
export const getPredictClaimMarketVersion = (
  positions: Pick<PredictPosition, 'outcomeId'>[] | undefined,
  marketVersions: Record<string, string | undefined> | undefined,
): PredictMarketVersionValue | undefined => {
  if (!marketVersions || !positions?.length) {
    return undefined;
  }

  const v2Count = positions.filter(
    (position) => marketVersions[position.outcomeId] === V2_MARKET_VERSION,
  ).length;

  if (v2Count === 0) {
    return PredictEventValues.MARKET_VERSION.V1;
  }

  return v2Count === positions.length
    ? PredictEventValues.MARKET_VERSION.V2
    : PredictEventValues.MARKET_VERSION.MIXED;
};
