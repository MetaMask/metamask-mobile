import type { SecurityVerdict } from '../SecurityPill/SecurityPill';

/**
 * Chain families the Security tab knows how to describe.
 *
 * Keyed by CAIP-2 namespace rather than by chain id, because the four contract
 * checks are a property of the chain family — every EIP-155 chain shows the
 * same four — and because `Record<SupportedSecurityNamespace, ...>` then turns
 * adding a family into a type error until it declares its checks.
 */
export const SupportedSecurityNamespace = {
  Eip155: 'eip155',
  Solana: 'solana',
} as const;

export type SupportedSecurityNamespace =
  (typeof SupportedSecurityNamespace)[keyof typeof SupportedSecurityNamespace];

/**
 * Every contract check the tab can render, across all chain families.
 *
 * A given token shows a subset chosen by `SECURITY_CHECKS_BY_NAMESPACE`, so
 * this is the union rather than any one chain's list.
 */
export const SecurityCheckKey = {
  NoHoneypot: 'no_honeypot',
  ContractVerified: 'contract_verified',
  Renounced: 'renounced',
  NoBlacklist: 'no_blacklist',
  NoMint: 'no_mint',
  Burnt: 'burnt',
  TopTenConcentration: 'top_ten_concentration',
} as const;

export type SecurityCheckKey =
  (typeof SecurityCheckKey)[keyof typeof SecurityCheckKey];

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
  Created: 'created',
} as const;

export type SecurityStatKey =
  (typeof SecurityStatKey)[keyof typeof SecurityStatKey];

/** Any row whose label opens an explainer. */
export type SecurityRowKey = SecurityCheckKey | SecurityStatKey;

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
  /** Chooses which four contract checks render. */
  namespace: SupportedSecurityNamespace;
  /** Same word as the pill, so the two surfaces cannot drift. */
  verdict: SecurityVerdict;
  /** Only read when the verdict is `medium_risk`, matching `SecurityPill`. */
  flagCount?: number;
  /**
   * The flag that fired, named rather than summarised as a pass ratio.
   * Only read when the verdict is `high_risk`.
   */
  highRiskFlag: string | null;
  /**
   * Partial because a check listed for a namespace may have no verdict yet,
   * which collapses "no data" and "not applicable" into the same dash.
   */
  checks: Partial<Record<SecurityCheckKey, SecurityCheck>>;
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
   * `null` omits the whole Trading section. Blockaid returns every fee as
   * `null` on Solana, so the section would otherwise be a heading above two
   * dashes.
   */
  trading: {
    buySellTax: string | null;
    volumeFlags: string | null;
  } | null;
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
