import type {
  TokenSecurityData,
  TokenSecurityFeature,
  TokenSecurityFinancialStats,
} from '@metamask/assets-controllers';

import { strings } from '../../../../../locales/i18n';
import type { SecurityVerdict } from '../components/V1/SecurityPill/SecurityPill';
import {
  CONTRACT_CHECK_KEYS,
  ContractCheckKey,
  type SecurityCheck,
  type SecurityCheckOutcome,
  type SecurityFacts,
} from '../components/V1/SecurityTab/SecurityTab.types';
import { countSecurityFlags, resolveSecurityReasons } from './securityReasons';

/**
 * How one contract check reads Blockaid's feature list.
 *
 * `failOn` wins over `passOn` so a payload carrying both a risk and its
 * reassurance resolves to the risk. Nothing has been observed doing that, but
 * the order has to be decided somewhere rather than left to object iteration.
 */
interface CheckRule {
  /** Any of these present means the check failed. */
  failOn?: readonly string[];
  /** Any of these present means it passed, once `failOn` has not matched. */
  passOn?: readonly string[];
  /** Where a payload mentioning none of the above lands. */
  otherwise: SecurityCheckOutcome;
}

/**
 * The only place in the codebase that decides whether a contract check passed.
 *
 * Every rule is pure presence or absence of a named featureId. The API's own
 * `type` is deliberately not consulted: it does not encode polarity, and the
 * same id carries different types on different chains — `OWNERSHIP_RENOUNCED`
 * arrives `Benign` on Solana and `Info` on EVM for the identical on-chain fact.
 *
 * TODO(product-safety): confirm that an absent feature is safe to read as a
 * pass. Blockaid's `features[]` lists the risks it detected, not the checks it
 * ran, so an absent `HONEYPOT` may mean "not a honeypot" or "not tested" and
 * these rules cannot tell the two apart. Three of the four fail open; only
 * `renounced` fails closed, because it is the one check whose happy path needs
 * a positive assertion rather than silence.
 */
const SECURITY_CHECK_RULES: Record<ContractCheckKey, CheckRule> = {
  [ContractCheckKey.NoHoneypot]: {
    failOn: ['HONEYPOT'],
    otherwise: 'pass',
  },
  /**
   * The only check Blockaid covers from both sides, so it is the only one that
   * can honestly resolve to `unknown` instead of guessing. Solana returns
   * neither id, which is where that third state earns its place.
   */
  [ContractCheckKey.ContractVerified]: {
    failOn: ['UNVERIFIED_CONTRACT'],
    passOn: ['VERIFIED_CONTRACT'],
    otherwise: 'unknown',
  },
  [ContractCheckKey.Renounced]: {
    passOn: ['OWNERSHIP_RENOUNCED'],
    otherwise: 'fail',
  },
  [ContractCheckKey.NoBlacklist]: {
    failOn: ['CAN_BLACKLIST'],
    otherwise: 'pass',
  },
};

/**
 * Every featureId the rules read, exposed so the reason map can be checked
 * against it without the rule table itself leaking out.
 *
 * `securityReasons.ts` has to stay in step: an id that fails a check here but
 * has no label there produces a token whose contract row reads "No" while the
 * section explaining why stays silent about it, and — since the flag count is
 * the length of that section — undercounts the flags as well.
 */
export const CONTRACT_CHECK_FEATURE_IDS: readonly string[] = [
  ...new Set(
    Object.values(SECURITY_CHECK_RULES).flatMap((rule) => [
      ...(rule.failOn ?? []),
      ...(rule.passOn ?? []),
    ]),
  ),
];

const resolveOutcome = (
  rule: CheckRule,
  featureIds: ReadonlySet<string>,
): SecurityCheckOutcome => {
  if (rule.failOn?.some((id) => featureIds.has(id))) {
    return 'fail';
  }
  if (rule.passOn?.some((id) => featureIds.has(id))) {
    return 'pass';
  }
  return rule.otherwise;
};

/**
 * The check's own wording — "Sells work", "Not renounced".
 *
 * `unknown` has no wording on purpose: the row renders a dash, and inventing a
 * phrase for it would be the one thing ASSETS-4022 forbids.
 */
const resolveValue = (
  checkKey: ContractCheckKey,
  outcome: SecurityCheckOutcome,
): string | null =>
  outcome === 'unknown'
    ? null
    : strings(
        `token_details_v1.security_tab.check_values.${checkKey}.${outcome}`,
      );

/**
 * Resolve all four contract checks against one token's feature list.
 *
 * Takes the features rather than the whole payload so the rules stay testable
 * without constructing a `TokenSecurityData`.
 */
export const resolveSecurityChecks = (
  features: readonly TokenSecurityFeature[],
): Record<ContractCheckKey, SecurityCheck> => {
  const featureIds = new Set(features.map((feature) => feature.featureId));

  return CONTRACT_CHECK_KEYS.reduce(
    (checks, checkKey) => {
      const outcome = resolveOutcome(
        SECURITY_CHECK_RULES[checkKey],
        featureIds,
      );
      checks[checkKey] = { outcome, value: resolveValue(checkKey, outcome) };
      return checks;
    },
    {} as Record<ContractCheckKey, SecurityCheck>,
  );
};

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
  };
};
