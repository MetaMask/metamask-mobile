import type { ExplainerCopy } from '../TokenExplainerSheet/TokenExplainerSheet.types';
import {
  SecurityCheckKey,
  SecurityStatKey,
  SupportedSecurityNamespace,
  type SecurityRowKey,
} from './SecurityTab.types';

/**
 * Rendered wherever Blockaid returned null.
 *
 * An em dash, in `text-alternative`, so a missing reading cannot be mistaken
 * for a real one. ASSETS-4022 forbids `0%` or a green tick standing in for
 * absent data.
 *
 * TODO(ASSETS-4056): the stat bar declares its own `STAT_EMPTY_VALUE` for the
 * same purpose. Collapse the two once both branches have landed.
 */
export const SECURITY_EMPTY_VALUE = '\u2014';

/**
 * Which four contract checks each chain family shows, in render order.
 *
 * Keyed by namespace so the rule lives in one readable place instead of being
 * spread through the JSX as conditionals, and so adding a family to
 * `SupportedSecurityNamespace` fails type checking here until it declares its
 * checks — a forgotten chain breaks the build rather than silently rendering
 * Ethereum's checks on a non-EVM token.
 *
 * TODO(ASSETS-4022): this table is hand-maintained against PRD section 14,
 * which is not reproduced anywhere reachable from the repo. Two things to
 * settle before wiring real data.
 *
 * First, whether the split can be derived from the response instead of
 * hard-coded. Sampling `/assets?includeTokenSecurityData=true` across four EVM
 * and three Solana memecoins found that `fees` and `created` ARE derivable —
 * both come back null on every Solana token and populated on every EVM one —
 * but the four checks are not, because `features[]` reports only what Blockaid
 * detected and never what it tested.
 *
 * Second, that `Renounced` belongs to EIP-155 alone. The same sampling returned
 * `OWNERSHIP_RENOUNCED` on all three Solana tokens, which contradicts the
 * acceptance criteria's claim that Solana never shows renounced.
 *
 * The Solana row is provisional for a third reason: the story's own open
 * question from 2 Oct about which Solana field backs `No blacklist` is
 * unanswered.
 */
export const SECURITY_CHECKS_BY_NAMESPACE: Record<
  SupportedSecurityNamespace,
  readonly SecurityCheckKey[]
> = {
  [SupportedSecurityNamespace.Eip155]: [
    SecurityCheckKey.NoHoneypot,
    SecurityCheckKey.ContractVerified,
    SecurityCheckKey.Renounced,
    SecurityCheckKey.NoBlacklist,
  ],
  [SupportedSecurityNamespace.Solana]: [
    SecurityCheckKey.NoMint,
    SecurityCheckKey.NoBlacklist,
    SecurityCheckKey.Burnt,
    SecurityCheckKey.TopTenConcentration,
  ],
};

/** Label beside each contract check. */
export const SECURITY_CHECK_LABEL_KEYS: Record<SecurityCheckKey, string> = {
  [SecurityCheckKey.NoHoneypot]:
    'token_details_v1.security_tab.checks.no_honeypot',
  [SecurityCheckKey.ContractVerified]:
    'token_details_v1.security_tab.checks.contract_verified',
  [SecurityCheckKey.Renounced]:
    'token_details_v1.security_tab.checks.renounced',
  [SecurityCheckKey.NoBlacklist]:
    'token_details_v1.security_tab.checks.no_blacklist',
  [SecurityCheckKey.NoMint]: 'token_details_v1.security_tab.checks.no_mint',
  [SecurityCheckKey.Burnt]: 'token_details_v1.security_tab.checks.burnt',
  [SecurityCheckKey.TopTenConcentration]:
    'token_details_v1.security_tab.checks.top_ten_concentration',
};

/** Label beside each stat row. */
export const SECURITY_STAT_LABEL_KEYS: Record<SecurityStatKey, string> = {
  [SecurityStatKey.Holders]: 'token_details_v1.security_tab.stats.holders',
  [SecurityStatKey.TopTen]: 'token_details_v1.security_tab.stats.top_ten',
  [SecurityStatKey.TotalLiquidity]:
    'token_details_v1.security_tab.stats.total_liquidity',
  [SecurityStatKey.LiquidityToMarketCap]:
    'token_details_v1.security_tab.stats.liquidity_to_market_cap',
  [SecurityStatKey.LpBurnedLocked]:
    'token_details_v1.security_tab.stats.lp_burned_locked',
  [SecurityStatKey.PrimaryPool]:
    'token_details_v1.security_tab.stats.primary_pool',
  [SecurityStatKey.BuySellTax]:
    'token_details_v1.security_tab.stats.buy_sell_tax',
  [SecurityStatKey.VolumeFlags]:
    'token_details_v1.security_tab.stats.volume_flags',
  [SecurityStatKey.Created]: 'token_details_v1.security_tab.stats.created',
};

/**
 * Copy for the explainer sheet behind each row's dotted underline.
 *
 * Keyed by every row the tab can render, so a row added later cannot ship
 * without a definition. Titles are separate from the row labels because a row
 * abbreviates to fit its line (`Liq/MC`, `Top 10`) while the sheet spells the
 * term out.
 */
export const SECURITY_EXPLAINER_KEYS: Record<SecurityRowKey, ExplainerCopy> = {
  [SecurityCheckKey.NoHoneypot]: {
    title: 'token_details_v1.security_tab.explainers.no_honeypot.title',
    description:
      'token_details_v1.security_tab.explainers.no_honeypot.description',
  },
  [SecurityCheckKey.ContractVerified]: {
    title: 'token_details_v1.security_tab.explainers.contract_verified.title',
    description:
      'token_details_v1.security_tab.explainers.contract_verified.description',
  },
  [SecurityCheckKey.Renounced]: {
    title: 'token_details_v1.security_tab.explainers.renounced.title',
    description:
      'token_details_v1.security_tab.explainers.renounced.description',
  },
  [SecurityCheckKey.NoBlacklist]: {
    title: 'token_details_v1.security_tab.explainers.no_blacklist.title',
    description:
      'token_details_v1.security_tab.explainers.no_blacklist.description',
  },
  [SecurityCheckKey.NoMint]: {
    title: 'token_details_v1.security_tab.explainers.no_mint.title',
    description: 'token_details_v1.security_tab.explainers.no_mint.description',
  },
  [SecurityCheckKey.Burnt]: {
    title: 'token_details_v1.security_tab.explainers.burnt.title',
    description: 'token_details_v1.security_tab.explainers.burnt.description',
  },
  [SecurityCheckKey.TopTenConcentration]: {
    title:
      'token_details_v1.security_tab.explainers.top_ten_concentration.title',
    description:
      'token_details_v1.security_tab.explainers.top_ten_concentration.description',
  },
  [SecurityStatKey.Holders]: {
    title: 'token_details_v1.security_tab.explainers.holders.title',
    description: 'token_details_v1.security_tab.explainers.holders.description',
  },
  [SecurityStatKey.TopTen]: {
    title: 'token_details_v1.security_tab.explainers.top_ten.title',
    description: 'token_details_v1.security_tab.explainers.top_ten.description',
  },
  [SecurityStatKey.TotalLiquidity]: {
    title: 'token_details_v1.security_tab.explainers.total_liquidity.title',
    description:
      'token_details_v1.security_tab.explainers.total_liquidity.description',
  },
  [SecurityStatKey.LiquidityToMarketCap]: {
    title:
      'token_details_v1.security_tab.explainers.liquidity_to_market_cap.title',
    description:
      'token_details_v1.security_tab.explainers.liquidity_to_market_cap.description',
  },
  [SecurityStatKey.LpBurnedLocked]: {
    title: 'token_details_v1.security_tab.explainers.lp_burned_locked.title',
    description:
      'token_details_v1.security_tab.explainers.lp_burned_locked.description',
  },
  [SecurityStatKey.PrimaryPool]: {
    title: 'token_details_v1.security_tab.explainers.primary_pool.title',
    description:
      'token_details_v1.security_tab.explainers.primary_pool.description',
  },
  [SecurityStatKey.BuySellTax]: {
    title: 'token_details_v1.security_tab.explainers.buy_sell_tax.title',
    description:
      'token_details_v1.security_tab.explainers.buy_sell_tax.description',
  },
  [SecurityStatKey.VolumeFlags]: {
    title: 'token_details_v1.security_tab.explainers.volume_flags.title',
    description:
      'token_details_v1.security_tab.explainers.volume_flags.description',
  },
  [SecurityStatKey.Created]: {
    title: 'token_details_v1.security_tab.explainers.created.title',
    description: 'token_details_v1.security_tab.explainers.created.description',
  },
};
