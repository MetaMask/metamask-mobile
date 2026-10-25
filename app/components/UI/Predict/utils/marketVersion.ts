import { V2_MARKET_VERSION } from '../providers/polymarket/constants';
import type { PredictOutcome } from '../types';

/**
 * True only for an outcome of a Gamma `version: "v2"` (Protocol V2) market.
 * Any other version — "v1", missing, or unknown — is a CTF market.
 */
export const isPolymarketV2Outcome = (
  outcome?: Pick<PredictOutcome, 'version'>,
): boolean => outcome?.version === V2_MARKET_VERSION;
