import type { TokenSecurityFeature } from '@metamask/assets-controllers';

import { strings } from '../../../../../locales/i18n';
import {
  ContractCheckKey,
  type SecurityCheck,
  type SecurityCheckOutcome,
} from '../components/V1/SecurityTab/SecurityTab.types';

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

/** In render order, so the tab and the detail screen cannot disagree. */
export const CONTRACT_CHECK_KEYS = Object.keys(
  SECURITY_CHECK_RULES,
) as ContractCheckKey[];

/**
 * Every featureId the rules read, exposed so the reason map can be checked
 * against it without the rule table itself leaking out.
 *
 * The two modules have to stay in step: an id that fails a check here but has
 * no label in `securityReasons.ts` produces a token whose contract row reads
 * "No" while the section explaining why stays silent about it, and — since the
 * flag count is the length of that section — undercounts the flags as well.
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
 * without constructing a `TokenSecurityData`, and so this module never grows a
 * second reason to change.
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
