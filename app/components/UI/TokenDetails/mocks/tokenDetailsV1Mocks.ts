import type { SecurityVerdict } from '../components/V1/SecurityPill/SecurityPill';
import {
  AdditionalCheckKey,
  ContractCheckKey,
  type SecurityTabFacts,
} from '../components/V1/SecurityTab/SecurityTab.types';

/**
 * Mocked Token Details V1 security data, in one place.
 *
 * Every security value the V1 page shows is declared here so that un-mocking is
 * one file to open and, eventually, one file to delete. The pill and the
 * Security tab both read from this module rather than declaring their own
 * constants, because they render the same verdict and must never disagree.
 *
 * Two mocks deliberately stay with their own stories rather than moving here,
 * to keep this story's diff free of unrelated churn:
 * `MOCK_TOKEN_AGE_LABEL` in `Views/TokenDetailsV1.tsx` belongs to ASSETS-4016,
 * and `MOCK_TOKEN_DESCRIPTION` in `components/tabs/OverviewTab.tsx` belongs to
 * ASSETS-4020.
 *
 * TODO(ASSETS-4022): replace with real data derived from `TokenSecurityData`.
 * The open questions blocking that, none of which affect layout:
 *
 * Blockaid's `features[]` lists only detected risks, never checks performed, so
 * the absence of `HONEYPOT` cannot honestly render as a passed check.
 *
 * `resultType` came back as `Verified` for every memecoin sampled, which the
 * G22 wording rule bans outright, and the API has no `Screened`, `Unscreened`
 * or `Pending` value — the five-state verdict is entirely client-side and needs
 * sign-off.
 *
 * No scan timestamp exists in the payload, so `checkedMinutesAgo` has nothing
 * behind it; `Pending` is additionally required to ship with a timestamp.
 *
 * Burn addresses carry no holder label (the observed set is `contract`,
 * `market`, `program`, `wallet`), so a third of the Top 10 exclusion rule has no
 * data behind it.
 *
 * `markets[]` has no primary-pool flag, is capped at ten entries, and can report
 * `marketType: UNKNOWN`.
 */

/**
 * The five metrics ASSETS-4056 requires to be identical in the stat bar and the
 * Security tab, declared once so the two cannot drift even while mocked.
 *
 * Values match `useTokenStatBarStats` rather than the V3 prototype. The
 * prototype shows `$2.4M` total liquidity against `Liq/MC 479.52%`, which would
 * put liquidity at nearly five times market cap — arithmetically impossible, so
 * it is filler rather than a reading to reproduce. These figures are internally
 * consistent: $560K against a $12.4M market cap genuinely is 4.52%.
 */
export const MOCK_SHARED_TOKEN_METRICS = {
  totalLiquidity: '$560.0K',
  /**
   * Not rendered on the Security tab, but `liquidityToMarketCap` is only
   * meaningful against it — keeping it here is what makes the ratio checkable
   * rather than a number nobody can verify.
   */
  marketCap: '$12.4M',
  liquidityToMarketCap: '4.52%',
  /**
   * Real holder counts reach seven figures — BONK reports 1,024,479 — so this
   * row must not be width-constrained even though the mock is four characters.
   */
  holdersCount: '12.9K',
  topTenPercentage: '18.4%',
  topTenFillPercentage: 18.4,
  /** Stated rather than derived in the view, so the two always sum to 100%. */
  remainingPercentage: '81.6%',
  buySellTax: '0% / 0%',
} as const;

/**
 * An EIP-155 token with a complete payload.
 *
 * `primaryPool` is left null on purpose so the gray-dash path renders on screen
 * rather than only in tests — ASSETS-4022 calls this out as the null rule
 * working.
 */
export const MOCK_SECURITY_FACTS_EVM: SecurityTabFacts = {
  verdict: 'screened',
  flagCount: 1,
  /**
   * A real Blockaid feature description, not a short tag. "High risk names the
   * flag that fired" means this sentence reaches the screen verbatim, so the
   * layout has to survive it wrapping.
   */
  highRiskFlag:
    'The blacklist function is included, which may restrict some accounts from trading',
  checks: {
    [ContractCheckKey.NoHoneypot]: {
      outcome: 'pass',
      value: 'Sells work',
    },
    [ContractCheckKey.ContractVerified]: { outcome: 'pass', value: 'Yes' },
    [ContractCheckKey.Renounced]: { outcome: 'pass', value: 'Renounced' },
    [ContractCheckKey.NoBlacklist]: { outcome: 'pass', value: 'No controls' },
    [AdditionalCheckKey.NoMint]: { outcome: 'pass', value: 'Fixed supply' },
    [AdditionalCheckKey.RugPullRisk]: {
      outcome: 'pass',
      value: 'Below threshold',
    },
    [AdditionalCheckKey.ContractControls]: {
      outcome: 'pass',
      value: 'None detected',
    },
  },
  holders: {
    count: MOCK_SHARED_TOKEN_METRICS.holdersCount,
    topTenPercentage: MOCK_SHARED_TOKEN_METRICS.topTenPercentage,
    remainingPercentage: MOCK_SHARED_TOKEN_METRICS.remainingPercentage,
    topTenFillPercentage: MOCK_SHARED_TOKEN_METRICS.topTenFillPercentage,
  },
  liquidity: {
    total: MOCK_SHARED_TOKEN_METRICS.totalLiquidity,
    liquidityToMarketCap: MOCK_SHARED_TOKEN_METRICS.liquidityToMarketCap,
    lpBurnedLocked: '100%',
    primaryPool: null,
  },
  trading: {
    buySellTax: MOCK_SHARED_TOKEN_METRICS.buySellTax,
    volumeFlags: 'None detected',
    listedOnExchange: 'No',
  },
  origin: {
    created: 'Sep 26, 2026',
  },
  checkedMinutesAgo: 2,
};

/**
 * A Solana token, which is a materially thinner payload rather than the EVM one
 * with different numbers.
 *
 * Every chain now renders the same rows, so this fixture no longer exists to
 * preview a different list. It exists because Solana is where the gaps show:
 *
 * `fees` comes back null on every Solana token sampled, so `trading` is null
 * here and the section is omitted instead of showing a heading above dashes.
 * `created` likewise comes back null, so Origin falls to a gray dash.
 *
 * `ContractVerified` is left absent rather than given an outcome, exercising
 * the unknown-check path. It is also the check least likely to resolve on
 * Solana in practice: it is the only one of the four that needs a positive
 * assertion from Blockaid rather than the absence of a risk feature, so it has
 * no fallback when the vendor says nothing.
 */
export const MOCK_SECURITY_FACTS_SOLANA: SecurityTabFacts = {
  verdict: 'screened',
  flagCount: 0,
  highRiskFlag: null,
  checks: {
    [ContractCheckKey.NoHoneypot]: { outcome: 'pass', value: 'Sells work' },
    [ContractCheckKey.Renounced]: { outcome: 'pass', value: 'Renounced' },
    [ContractCheckKey.NoBlacklist]: { outcome: 'pass', value: 'No controls' },
    [AdditionalCheckKey.NoMint]: { outcome: 'pass', value: 'Revoked' },
    [AdditionalCheckKey.RugPullRisk]: {
      outcome: 'pass',
      value: 'Below threshold',
    },
  },
  holders: {
    count: MOCK_SHARED_TOKEN_METRICS.holdersCount,
    topTenPercentage: MOCK_SHARED_TOKEN_METRICS.topTenPercentage,
    remainingPercentage: MOCK_SHARED_TOKEN_METRICS.remainingPercentage,
    topTenFillPercentage: MOCK_SHARED_TOKEN_METRICS.topTenFillPercentage,
  },
  liquidity: {
    total: MOCK_SHARED_TOKEN_METRICS.totalLiquidity,
    liquidityToMarketCap: MOCK_SHARED_TOKEN_METRICS.liquidityToMarketCap,
    lpBurnedLocked: null,
    primaryPool: 'Orca · Bonk / SOL',
  },
  trading: null,
  origin: {
    created: null,
  },
  checkedMinutesAgo: null,
};

/**
 * Verdict shown on the hero's security pill.
 *
 * Derived from the EVM fact set rather than declared independently, so the pill
 * and the Security tab cannot show different words. Change
 * `MOCK_SECURITY_FACTS_EVM.verdict` to preview the other states; the flag count
 * is only rendered for `medium_risk`.
 */
export const MOCK_SECURITY_VERDICT: SecurityVerdict =
  MOCK_SECURITY_FACTS_EVM.verdict;

export const MOCK_SECURITY_FLAG_COUNT: number =
  MOCK_SECURITY_FACTS_EVM.flagCount ?? 0;
