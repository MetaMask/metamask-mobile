import type {
  TokenSecurityData,
  TokenSecurityFinancialStats,
} from '@metamask/assets-controllers';

import type { SecurityVerdict } from '../components/V1/SecurityPill/SecurityPill';
import type { SecurityFacts } from '../components/V1/SecurityTab/SecurityTab.types';
import { resolveSecurityChecks } from './securityChecks';
import { countSecurityFlags, resolveSecurityReasons } from './securityReasons';

/**
 * Blockaid's verdict word, mapped to the pill's.
 *
 * The API has no `Screened`, `Unscreened` or `Pending`; those three are ours.
 * An unrecognised or omitted `resultType` lands on `unscreened` rather than
 * the nearest neighbour, because the API offers no guarantee that the five
 * documented values are the only ones it will ever send, and the safe reading
 * of a word we do not know is that the token was not screened.
 */
const VERDICT_BY_RESULT_TYPE: Readonly<Record<string, SecurityVerdict>> = {
  Verified: 'screened',
  Benign: 'screened',
  Warning: 'medium_risk',
  Spam: 'medium_risk',
  Malicious: 'high_risk',
};

/**
 * Sum of the top ten holders' share, capped because the API can overshoot.
 *
 * Exported because `useTokenStats` formats the same figure for the Top 10 row
 * while the holders bar needs it raw to size itself. One function so the
 * picture and the number beside it cannot disagree.
 */
export const sumTopTenPercentage = (
  financialStats: TokenSecurityFinancialStats | null | undefined,
): number | null => {
  const holders = financialStats?.topHolders;
  if (!holders?.length) {
    return null;
  }
  const total = holders.reduce(
    (sum, holder) => sum + (holder.holdingPercentage ?? 0),
    0,
  );
  return Math.min(total, 100);
};

/**
 * Facts for a token the API has nothing on, or could not be asked.
 *
 * Every field dashes out rather than reading zero: no flags found is a real
 * reading and "we did not find out" is not, so the two must not share a
 * rendering.
 */
export const emptySecurityFacts = (
  verdict: SecurityVerdict,
): SecurityFacts => ({
  verdict,
  flagCount: 0,
  reasons: [],
  checks: {},
  topTenPercentage: null,
  checkedMinutesAgo: null,
});

/**
 * What Blockaid concluded about a token, derived from one payload.
 *
 * Judgement only: the verdict, how many flags fired, which ones, and whether
 * each contract check passed. The figures the same payload carries — holders,
 * liquidity, tax, pools — are not here. They go through `useTokenStats`
 * alongside the price API's, because the stat bar shows most of them too and
 * deriving them twice is what let the two surfaces disagree.
 *
 * `topTenPercentage` is the one exception, and only because it is not a stat:
 * the holders bar needs it as a raw 0-100 to size its fill, where every other
 * figure crosses the boundary already formatted.
 *
 * Pure, and the only place `features[]` is interpreted. The tab, the Contract
 * security screen and the hero pill all consume its output, which is what
 * stops the three judging the same token differently.
 */
export const deriveSecurityFacts = (
  securityData: TokenSecurityData,
): SecurityFacts => {
  const features = securityData.features ?? [];
  const verdict =
    VERDICT_BY_RESULT_TYPE[securityData.resultType] ?? 'unscreened';

  return {
    verdict,
    flagCount: countSecurityFlags(features),
    reasons: resolveSecurityReasons(features, verdict),
    checks: resolveSecurityChecks(features),
    topTenPercentage: sumTopTenPercentage(securityData.financialStats),
    /**
     * TODO(ASSETS-4022): Blockaid returns no scan timestamp, so the "checked N
     * min ago" clause has nothing behind it and the line shows attribution
     * only.
     */
    checkedMinutesAgo: null,
  };
};
