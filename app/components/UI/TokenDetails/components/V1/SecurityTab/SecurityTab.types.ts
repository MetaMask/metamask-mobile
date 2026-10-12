import type { TokenStatKey } from '../../../constants/tokenStats';
import type { SecurityReason } from '../../../utils/securityReasons';
import type { SecurityVerdict } from '../SecurityPill/SecurityPill';

/**
 * The four contract checks, shown on the Security tab and repeated at the top
 * of the Contract security screen.
 *
 * The same four on every chain. An earlier revision picked a different set per
 * CAIP-2 namespace, on the acceptance criteria's claim that a Solana token
 * never shows honeypot, renounced or contract verified. Sampling contradicted
 * a third of that rule outright — `OWNERSHIP_RENOUNCED` came back on all three
 * Solana tokens — and could not confirm the rest either way, because every
 * other check reads the *absence* of a feature and three tokens cannot tell
 * "capability not present" apart from "check not run on this chain".
 *
 * So the list is fixed and a check with nothing behind it resolves to
 * `unknown`, which renders the dash. That states what is actually known
 * instead of encoding a per-chain rule the evidence could not support.
 */
export const ContractCheckKey = {
  NoHoneypot: 'no_honeypot',
  ContractVerified: 'contract_verified',
  Renounced: 'renounced',
  NoBlacklist: 'no_blacklist',
} as const;

export type ContractCheckKey =
  (typeof ContractCheckKey)[keyof typeof ContractCheckKey];

/**
 * Whether a check passed, failed, or could not be determined.
 *
 * `unknown` is a first-class outcome, not an error: ASSETS-4022 requires a gray
 * dash rather than a green tick whenever Blockaid has nothing to say, so the
 * row needs to distinguish "clean" from "not established".
 */
export type SecurityCheckOutcome = 'pass' | 'fail' | 'unknown';

export interface SecurityCheck {
  outcome: SecurityCheckOutcome;
  /**
   * The check's own wording, already localized — "Sells work", "Renounced".
   * `null` renders the gray dash, which `unknown` always uses.
   */
  value: string | null;
}

/**
 * Any row whose label opens an explainer.
 *
 * The stat half is `TokenStatKey`, shared with the stat bar. The tab used to
 * declare its own `SecurityStatKey` covering the same ten rows, which drifted:
 * two keys matched the bar's by accident while three differed only in
 * spelling, and the figures behind them were derived twice.
 */
export type SecurityRowKey = ContractCheckKey | TokenStatKey;

/**
 * What Blockaid concluded about a token.
 *
 * Judgement, not statistics. The figures the Security tab renders live in
 * `TokenStatValues` and come from `useTokenStats`, which the stat bar reads
 * too. Splitting them that way is what lets the Contract security screen and
 * the hero pill consume this without acquiring a market-data dependency for
 * numbers they never show.
 */
export interface SecurityFacts {
  /**
   * Same word as the pill, so the two surfaces cannot drift.
   *
   * No longer rendered on the tab itself — the Contract heading replaced the
   * pill with a chevron into the Contract security screen. Kept because
   * `SecuritySocialSection` still shows the verdict and reads it from the same
   * fixtures, so dropping it here would only push the duplication elsewhere.
   */
  verdict: SecurityVerdict;
  /** Only read when the verdict is `medium_risk`, matching `SecurityPill`. */
  flagCount?: number;
  /**
   * What Blockaid actually found, explaining the verdict in its own right.
   *
   * Replaces the three fixed "Additional checks" rows. Those asked a question
   * the payload cannot answer — `features[]` reports detected risks, never
   * checks performed — so a fixed row had to infer a pass from silence. A
   * derived list only ever states what came back, and is empty when nothing
   * did.
   */
  reasons: SecurityReason[];
  /**
   * Partial because a check may have no verdict yet, which collapses "no data"
   * and "not applicable" into the same dash.
   */
  checks: Partial<Record<ContractCheckKey, SecurityCheck>>;
  /**
   * Top ten holders' combined share as a raw number in the range 0-100, used
   * to size the distribution bar's fill.
   *
   * The one figure here rather than in `TokenStatValues`, because it is the
   * one the tab needs unformatted. `null` hides the bar rather than drawing an
   * empty one, since a zero-width bar would read as "0% concentration" — a
   * reassuring claim rather than an absence.
   */
  topTenPercentage: number | null;
  /**
   * Minutes since the Blockaid scan, for the provenance line sitting under the
   * contract checks.
   *
   * `null` drops the "checked N min ago" clause and leaves the attribution
   * alone. Blockaid returns no scan timestamp today, so this is expected to be
   * `null` in production until the payload grows one.
   */
  checkedMinutesAgo: number | null;
}
