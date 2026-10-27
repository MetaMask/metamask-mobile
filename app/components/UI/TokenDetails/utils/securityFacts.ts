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

/**
 * How severe a detected risk is, and therefore what colour its row takes.
 *
 * Two values rather than Blockaid's five, because only two of them are ever
 * rendered: `Benign` and `Info` never reach a row, and `Spam` is folded into
 * `warning`. The sheet's own heading says "warning and malicious only".
 */
export type RiskSeverity = 'malicious' | 'warning';

/**
 * Feature types that count as a detected risk.
 *
 * `Info` is excluded, and that exclusion is the whole point of this set.
 * Blockaid uses `Info` for "the contract can do this" regardless of whether
 * the capability is good or bad: Coinbase Wrapped XRP comes back `Verified`
 * with `IS_MINTABLE`, `CAN_BLACKLIST`, `PROXY_CONTRACT`, `EXTERNAL_FUNCTIONS`
 * and `OWNERSHIP_RENOUNCED` all typed `Info`. Listing that bucket as risks
 * would offer "can blacklist" as something we found wrong with a clean token.
 *
 * `Benign` is excluded for the opposite reason: it is good news, and the
 * Additional checks section only ever states what is wrong.
 */
const RISK_FEATURE_TYPES: ReadonlySet<string> = new Set([
  'Warning',
  'Spam',
  'Malicious',
]);

/** Where every risk row's title and description live. */
const RISK_COPY_PREFIX = 'token_details_v1.security_tab.risks';

/**
 * How one contract check reads the feature list, and how its row reads on
 * screen.
 *
 * `failOn` wins over `passOn` so a payload carrying both a risk and its
 * reassurance resolves to the risk. Nothing has been observed doing that, but
 * the order has to be decided somewhere rather than left to object iteration.
 */
interface ContractCheck {
  /** Any of these present means the check failed. Wins over `passOn`. */
  failOn?: readonly string[];
  /** Any of these present means it passed, once `failOn` has not matched. */
  passOn?: readonly string[];
  /** Where a payload mentioning none of the above lands. */
  otherwise: SecurityCheckOutcome;
  /**
   * `verdict` rows carry a pass/fail glyph in green or red. `neutral` rows
   * carry none and stay on the default text colour.
   *
   * `is_mintable` is the one neutral row, because it is the one check named as
   * a question rather than as the desirable state. Its pass means the mint
   * capability is *present*, so a green tick beside "Yes" would read as
   * reassurance about the thing the reader is wary of, and a red cross on "No"
   * would fail a token for being unable to mint. Martin's sheet types it
   * `Info`, which is the same statement: neither answer is news.
   */
  tone: 'verdict' | 'neutral';
}

/**
 * The only place in the codebase that decides whether a contract check passed,
 * and the only place that decides how its row reads.
 *
 * Everything about a check is one entry, so adding a sixth means touching one
 * table rather than a rule map plus three locale-key maps plus a presentation
 * map. The locale keys are not here because they are all reachable by
 * interpolation from the check key — see `resolveValue` below and
 * `resolveCheckPresentation` in `SecurityTab.constants.ts`.
 *
 * Every rule is pure presence or absence of a named featureId. The API's own
 * `type` is deliberately not consulted: it does not encode polarity, and the
 * same id carries different types on different chains — `OWNERSHIP_RENOUNCED`
 * arrives `Benign` on Solana and `Info` on EVM for the identical on-chain fact.
 *
 * `features[]` lists the risks Blockaid detected, not the checks it ran, so an
 * absent `HONEYPOT` may mean "not a honeypot" or "not tested" and these rules
 * cannot tell the two apart. Each check therefore picks a side in `otherwise`.
 * Silence reads as reassuring on `no_honeypot`, `no_blacklist` and
 * `is_mintable` — whose `fail` prints "No", the inversion described below.
 * `renounced` and `contract_verified` instead resolve to `unknown` when
 * neither of their explicit poles is present, since Blockaid only emits an
 * ownership/verification signal when it has one to report (confirmed Oct 2026).
 */
export const CONTRACT_CHECKS: Readonly<
  Record<ContractCheckKey, ContractCheck>
> = {
  [ContractCheckKey.NoHoneypot]: {
    failOn: ['HONEYPOT', 'UNSELLABLE_TOKEN', 'FREEZE_INSTRUCTION_TRIGGERED'],
    otherwise: 'pass',
    tone: 'verdict',
  },
  /**
   * The only check Blockaid covers from both sides on EVM, so it is the only
   * one that can honestly resolve to `unknown` instead of guessing. Solana
   * returns neither id, which is where that third state earns its place.
   */
  [ContractCheckKey.ContractVerified]: {
    failOn: ['UNVERIFIED_CONTRACT'],
    passOn: ['VERIFIED_CONTRACT'],
    otherwise: 'unknown',
    tone: 'verdict',
  },
  /**
   * Both poles are explicit featureIds, and Blockaid only emits one when it
   * has a specific ownership signal to report — so absent *both*, it has not
   * asserted an ownership state, and the honest reading is `unknown` rather
   * than guessing "not renounced". Confirmed by Blockaid (Oct 2026): neither
   * id present -> Unknown / not checked. This mirrors `contract_verified`.
   */
  [ContractCheckKey.Renounced]: {
    failOn: ['OWNERSHIP_NOT_RENOUNCED'],
    passOn: ['OWNERSHIP_RENOUNCED'],
    otherwise: 'unknown',
    tone: 'verdict',
  },
  [ContractCheckKey.NoBlacklist]: {
    failOn: ['CAN_BLACKLIST'],
    otherwise: 'pass',
    tone: 'verdict',
  },
  /**
   * Inverted versus its four neighbours: a pass means the capability is
   * present. That inversion is why the row is `neutral` rather than why it is
   * wrong — see `ContractCheck.tone`.
   */
  [ContractCheckKey.IsMintable]: {
    passOn: ['IS_MINTABLE'],
    otherwise: 'fail',
    tone: 'neutral',
  },
};

/**
 * One row of Martin's sheet: a group of featureIds that render as a single
 * finding.
 *
 * One entry per row rather than one per featureId, so the table diffs
 * line-for-line against the source document and two ids on the same row cannot
 * drift to different severities.
 */
interface AdditionalCheck {
  /** Stable id, keying the rendered row, its testID and its locale block. */
  id: string;
  /** Every featureId the sheet lists on this row. */
  featureIds: readonly string[];
  /**
   * Fixed per row and never read from `feature.type`, except the sheet's three
   * "Mixed — default to highest severity (feature.type)" rows, which carry
   * `'mixed'` and are resolved at render from the types of the ids that
   * actually matched (see `resolveAdditionalChecks`). The API's type does not
   * encode polarity consistently and the same id arrives typed differently on
   * different chains, so a fixed row's colour must not shift with whichever
   * sibling ids happened to come back.
   */
  severity: RiskSeverity | 'mixed';
}

/**
 * Every finding the Additional checks section can show, in the sheet's order,
 * which is the order they render in.
 *
 * Titles and descriptions are not here: they are reached as
 * `token_details_v1.security_tab.risks.<id>.{title,description}`, so the
 * sheet's copy lives in `en.json` alone and is translatable.
 *
 * Source: `Blockaid features TDP mappings - All Features.csv`, which groups 46
 * featureIds into these 14 rows. The appendix cites
 * https://docs.blockaid.io/docs/EUP/parse-security-risk-and-context
 */
const ADDITIONAL_CHECKS: readonly AdditionalCheck[] = [
  {
    id: 'known_malicious',
    featureIds: ['KNOWN_MALICIOUS', 'COMPROMISED_TOKEN'],
    severity: 'malicious',
  },
  {
    id: 'dangerous_contract_behavior',
    featureIds: [
      'TOKEN_BACKDOOR',
      'STATIC_CODE_SIGNATURE',
      'SIMILAR_MALICIOUS_CONTRACT',
      'DYNAMIC_ANALYSIS',
    ],
    /**
     * The sheet says "Mixed — default to highest severity (feature.type)":
     * resolved at render from the matched ids' types, not hardcoded.
     */
    severity: 'mixed',
  },
  {
    id: 'impersonation_risk',
    featureIds: [
      'IMPERSONATOR',
      'IMPERSONATOR_SENSITIVE_ASSET',
      'IMPERSONATOR_HIGH_CONFIDENCE',
      'IMPERSONATOR_MEDIUM_CONFIDENCE',
    ],
    /**
     * "Mixed" in the sheet, as above. Resolving from `feature.type` also fixes
     * the prototype's amber draw for low/medium-confidence impersonators,
     * which the old hardcoded `malicious` rendered red.
     */
    severity: 'mixed',
  },
  {
    id: 'rug_pull',
    featureIds: ['RUGPULL', 'POST_DUMP', 'KNOWN_RUGPULL_CODE_PATTERN'],
    severity: 'malicious',
  },
  {
    id: 'exit_scam_risk',
    featureIds: ['EXIT_SCAM_RISK'],
    severity: 'warning',
  },
  {
    id: 'high_token_fees',
    featureIds: ['HIGH_TRANSFER_FEE', 'HIGH_BUY_FEE', 'HIGH_SELL_FEE'],
    severity: 'malicious',
  },
  {
    id: 'low_liquidity_risk',
    featureIds: ['UNSTABLE_TOKEN_PRICE'],
    severity: 'warning',
  },
  {
    id: 'concentrated_ownership',
    featureIds: [
      'CONCENTRATED_SUPPLY_DISTRIBUTION',
      'HIDDEN_SUPPLY_BY_KEY_HOLDER',
      'HIGH_SNIPERS_PERCENTAGE',
      'HIGH_BUNDLERS_PERCENTAGE',
      'HIGH_DEV_PERCENTAGE',
      'HIGH_INITIAL_SNIPERS_PERCENTAGE',
      'HIGH_INSIDERS_PERCENTAGE',
    ],
    severity: 'warning',
  },
  {
    id: 'wash_trading',
    featureIds: ['WASH_TRADING', 'FAKE_VOLUME', 'FAKE_TRADE_MAKER_COUNT'],
    severity: 'warning',
  },
  {
    id: 'sniped_at_launch',
    featureIds: ['SNIPE_AT_MINT'],
    severity: 'warning',
  },
  {
    id: 'suspicious_creator',
    featureIds: ['LOW_REPUTATION_CREATOR', 'SUSPICIOUS_FUND_TRAIL'],
    severity: 'warning',
  },
  {
    id: 'sanctioned_creator',
    featureIds: ['SANCTIONED_CREATOR'],
    severity: 'malicious',
  },
  {
    id: 'suspicious_airdrop',
    featureIds: ['AIRDROP_PATTERN', 'SPAM_TEXT', 'METADATA'],
    /** "Mixed" in the sheet, as above. */
    severity: 'mixed',
  },
  {
    id: 'liquidity_withdrawal_risk',
    featureIds: [
      'INSUFFICIENT_LOCKED_LIQUIDITY',
      'LIQUIDITY_UNLOCK_ON_MIGRATION',
    ],
    severity: 'warning',
  },
];

/**
 * One rendered row of the Additional checks section.
 *
 * Note the vocabulary, which is kept distinct on purpose: an *additional
 * check* is an entry in the table above, a *risk* is one the payload matched.
 */
export interface SecurityRisk {
  /** The table row's id, or the featureId itself for an unmapped finding. */
  id: string;
  severity: RiskSeverity;
  /** Already localized. */
  title: string;
  /** Already localized, except on the default row — see below. */
  description: string;
  /**
   * Which featureIds landed on this row. Carried so a test can name the signal
   * it is asserting on rather than matching translated copy.
   */
  featureIds: readonly string[];
}

/**
 * Every featureId a contract check reads.
 *
 * Exported so the Additional checks list can exclude them without the rule
 * table itself leaking out. This is the de-duplication the two sections need:
 * a detected `HONEYPOT` already shows as a red cross on "No honeypot", so
 * repeating it below as a finding would count the same fact twice.
 */
export const CONTRACT_CHECK_FEATURE_IDS: readonly string[] = [
  ...new Set(
    Object.values(CONTRACT_CHECKS).flatMap((check) => [
      ...(check.failOn ?? []),
      ...(check.passOn ?? []),
    ]),
  ),
];

const CONTRACT_CHECK_FEATURE_ID_SET: ReadonlySet<string> = new Set(
  CONTRACT_CHECK_FEATURE_IDS,
);

/** Every featureId the additional-checks table names, for the default case. */
const GROUPED_FEATURE_IDS: ReadonlySet<string> = new Set(
  ADDITIONAL_CHECKS.flatMap((check) => check.featureIds),
);

const resolveOutcome = (
  check: ContractCheck,
  featureIds: ReadonlySet<string>,
): SecurityCheckOutcome => {
  if (check.failOn?.some((id) => featureIds.has(id))) {
    return 'fail';
  }
  if (check.passOn?.some((id) => featureIds.has(id))) {
    return 'pass';
  }
  return check.otherwise;
};

/**
 * The check's own wording — "Honeypot detected", "Not renounced".
 *
 * Built by interpolation rather than read from a map, which is the pattern the
 * three deleted locale-key maps now follow too. `unknown` has no wording on
 * purpose: the row renders a dash, and inventing a phrase for it would be the
 * one thing ASSETS-4022 forbids.
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
 * Resolve all five contract checks against one token's feature list.
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
      const outcome = resolveOutcome(CONTRACT_CHECKS[checkKey], featureIds);
      checks[checkKey] = { outcome, value: resolveValue(checkKey, outcome) };
      return checks;
    },
    {} as Record<ContractCheckKey, SecurityCheck>,
  );
};

/**
 * Highest severity among the features that matched a "Mixed" row.
 *
 * The sheet's three Mixed rows read "default to highest severity
 * (feature.type)": malicious when one matched id is typed `Malicious`,
 * otherwise warning. Warning and Spam both read warning, and Benign/Info never
 * reach here — `resolveAdditionalChecks` has already filtered to risk types.
 */
const highestSeverity = (
  matched: readonly TokenSecurityFeature[],
): RiskSeverity =>
  matched.some((feature) => feature.type === 'Malicious')
    ? 'malicious'
    : 'warning';

/**
 * What Blockaid found that the five contract checks do not already show.
 *
 * Four steps, in order.
 *
 * First, keep only features typed `Warning`, `Spam` or `Malicious`. For most
 * rows this is the only thing `feature.type` decides — whether the row was
 * detected at all, not its colour; the three "Mixed" rows are the exception.
 *
 * Second, drop anything a contract check reads, so the same fact is not stated
 * in two sections and counted twice.
 *
 * Third, collapse the remainder onto their table rows, in the sheet's order.
 * Three fee ids landing on one row render one row, which is what keeps the
 * count on the banner equal to the number of rows on screen.
 *
 * Last, anything the table does not name becomes one "Risk detected" row per
 * id.
 *
 * That last step is the only place Blockaid's own English reaches a screen.
 * It, and the three "Mixed" rows, are where a row's severity comes from
 * `feature.type`: the sheet's default case reads "Dynamic: use Blockaid's
 * description" and "default to highest severity, warning and malicious only",
 * and the mention of warning is what makes a per-feature type the right read.
 */
export const resolveAdditionalChecks = (
  features: readonly TokenSecurityFeature[],
): SecurityRisk[] => {
  const detected = features.filter(
    (feature) =>
      RISK_FEATURE_TYPES.has(feature.type) &&
      !CONTRACT_CHECK_FEATURE_ID_SET.has(feature.featureId),
  );

  if (detected.length === 0) {
    return [];
  }

  const detectedIds = new Set(detected.map((feature) => feature.featureId));

  const grouped: SecurityRisk[] = ADDITIONAL_CHECKS.filter((check) =>
    check.featureIds.some((id) => detectedIds.has(id)),
  ).map((check) => {
    const matchedIds = check.featureIds.filter((id) => detectedIds.has(id));
    return {
      id: check.id,
      // The sheet's three "Mixed" rows take the highest type of the ids that
      // actually matched; every other row keeps its fixed severity.
      severity:
        check.severity === 'mixed'
          ? highestSeverity(
              detected.filter((feature) =>
                matchedIds.includes(feature.featureId),
              ),
            )
          : check.severity,
      title: strings(`${RISK_COPY_PREFIX}.${check.id}.title`),
      description: strings(`${RISK_COPY_PREFIX}.${check.id}.description`),
      featureIds: matchedIds,
    };
  });

  const ungrouped: SecurityRisk[] = detected
    .filter((feature) => !GROUPED_FEATURE_IDS.has(feature.featureId))
    .map((feature) => ({
      // The featureId rather than a shared `default`, so several unmapped
      // findings keep distinct React keys and testIDs.
      id: feature.featureId,
      severity: feature.type === 'Malicious' ? 'malicious' : 'warning',
      title: strings(`${RISK_COPY_PREFIX}.default.title`),
      description: feature.description,
      featureIds: [feature.featureId],
    }));

  return [...grouped, ...ungrouped];
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
 * How bad the token is, from Blockaid's own verdict word.
 *
 * `resultType` is authoritative: `Verified`/`Benign` give the green
 * `screened`, `Warning`/`Spam` the amber `medium_risk`, `Malicious` the red
 * `high_risk`. A word we do not recognise — or a missing one — gives
 * `unscreened` rather than overclaiming a clean screen.
 *
 * The pill reads only this. The Additional-checks rows shown below come from
 * `resolveAdditionalChecks` independently, so a token can read `screened`
 * while still listing individual signals (e.g. a `Benign` token that carries
 * `UNSTABLE_TOKEN_PRICE`). There is no `pending` case: `useSecurityFacts`
 * short-circuits on both loading and error before `deriveSecurityFacts` is
 * ever reached.
 */
export const resolveVerdict = (
  securityData: TokenSecurityData,
): SecurityVerdict =>
  VERDICT_BY_RESULT_TYPE[securityData.resultType] ?? 'unscreened';

/**
 * Sum of the top ten WALLET holders' share, capped because the API can
 * overshoot.
 *
 * Only `label === 'wallet'` holders count: AMM pools (`market`), Solana
 * routers (`program`), `locker` and `contract` entries are excluded, because
 * counting them inflates concentration toward ~100% for pooled tokens (a
 * single AMM pool can hold 99%+). Blockaid confirmed this is the intended
 * reading, and the API returns the label lowercase.
 *
 * Caveat: the top-10 cap is applied after filtering, so if fewer than 10
 * wallets survive the filter the capped list cannot reconstruct the true
 * top-10 wallet share and may slightly undercount. That is acceptable.
 *
 * Exported because `useTokenStats` formats the same figure for the Top 10 row
 * while the holders bar needs it raw to size itself. One function so the
 * picture and the number beside it cannot disagree.
 */
export const sumTopTenPercentage = (
  financialStats: TokenSecurityFinancialStats | null | undefined,
): number | null => {
  const walletHolders = financialStats?.topHolders?.filter(
    (holder) => holder.label === 'wallet',
  );
  if (!walletHolders?.length) {
    return null;
  }
  const total = walletHolders
    .slice(0, 10)
    .reduce((sum, holder) => sum + (holder.holdingPercentage ?? 0), 0);
  return Math.min(total, 100);
};

/**
 * Facts for a token the API has nothing on, or could not be asked.
 *
 * Every field dashes out rather than reading zero: no risks found is a real
 * reading and "we did not find out" is not, so the two must not share a
 * rendering.
 */
export const emptySecurityFacts = (
  verdict: SecurityVerdict,
): SecurityFacts => ({
  verdict,
  risks: [],
  checks: {},
  topTenPercentage: null,
});

/**
 * What Blockaid concluded about a token, derived from one payload.
 *
 * Judgement only: the verdict, which risks fired, and whether each contract
 * check passed. The figures the same payload carries — holders, liquidity,
 * tax, pools — are not here. They go through `useTokenStats` alongside the
 * price API's, because the stat bar shows most of them too and deriving them
 * twice is what let the two surfaces disagree.
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
  const risks = resolveAdditionalChecks(features);

  return {
    verdict: resolveVerdict(securityData),
    risks,
    checks: resolveSecurityChecks(features),
    topTenPercentage: sumTopTenPercentage(securityData.financialStats),
  };
};
