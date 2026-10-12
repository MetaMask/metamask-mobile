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
 * Every stat row on the tab, used to key the explainer copy so a row cannot
 * ship without a definition behind its dotted underline.
 */
export const SecurityStatKey = {
  Holders: 'holders',
  TopTen: 'top_ten',
  TotalLiquidity: 'total_liquidity',
  LiquidityToMarketCap: 'liquidity_to_market_cap',
  LpBurnedLocked: 'lp_burned_locked',
  PrimaryPool: 'primary_pool',
  BuySellTax: 'buy_sell_tax',
  VolumeFlags: 'volume_flags',
  ListedOnExchange: 'listed_on_exchange',
  Created: 'created',
} as const;

export type SecurityStatKey =
  (typeof SecurityStatKey)[keyof typeof SecurityStatKey];

/** Any row whose label opens an explainer. */
export type SecurityRowKey = ContractCheckKey | SecurityStatKey;

/**
 * Everything the Security tab renders, already formatted for display.
 *
 * Deliberately a view model rather than the raw `TokenSecurityData`: the tab
 * shows values drawn from two different sources (Blockaid for the checks and
 * holders, `AssetsController.assetsPrice` for the market cap behind Liq/MC),
 * and several of them are owned by ASSETS-4056 so that the stat bar and this
 * tab cannot disagree. Keeping the component on formatted strings means the
 * later wiring replaces one module and touches no JSX.
 *
 * Every value is `string | null` because ASSETS-4022 requires a gray dash for
 * any field Blockaid returns as null — and because `0` is a real reading for
 * tax, the null test has to happen before formatting, never after.
 */
export interface SecurityTabFacts {
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
  holders: {
    count: string | null;
    topTenPercentage: string | null;
    /** Everyone outside the top ten — the other half of the bar's legend. */
    remainingPercentage: string | null;
    /**
     * The same top-ten figure as a number in the range 0-100, used only to
     * size the distribution bar. `null` hides the bar rather than drawing an
     * empty one, since a zero-width bar would read as "0% concentration".
     */
    topTenFillPercentage: number | null;
  };
  liquidity: {
    total: string | null;
    liquidityToMarketCap: string | null;
    lpBurnedLocked: string | null;
    primaryPool: string | null;
  };
  /**
   * Always rendered, dashing out the fields a chain does not report.
   *
   * It used to be nullable so Solana — where every `fees` field comes back
   * null — showed no Trading heading at all. That also hid Volume flags and
   * Listed on exchange, which Solana does populate, so the section is now
   * unconditional and each row nulls out on its own.
   */
  trading: {
    buySellTax: string | null;
    volumeFlags: string | null;
    listedOnExchange: string | null;
  };
  origin: {
    created: string | null;
  };
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
