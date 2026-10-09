import {
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import {
  AdditionalCheckKey,
  ContractCheckKey,
  SecurityCheckKey,
  SecurityStatKey,
  type SecurityCheckOutcome,
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
 * How each check outcome presents.
 *
 * Shared by the tab and the Contract security screen rather than declared in
 * each: the screen is one tap from the tab and repeats the same four checks, so
 * a fork here would show the same check as passing in two different colours.
 *
 * Typed as a full `Record` so a third outcome cannot be added to
 * `SecurityCheckOutcome` without deciding how it looks.
 */
export const CHECK_OUTCOME_PRESENTATION: Record<
  SecurityCheckOutcome,
  { icon?: { name: IconName; color: IconColor }; valueColor: TextColor }
> = {
  pass: {
    icon: { name: IconName.CheckBold, color: IconColor.SuccessDefault },
    valueColor: TextColor.SuccessDefault,
  },
  fail: {
    icon: { name: IconName.Close, color: IconColor.ErrorDefault },
    valueColor: TextColor.ErrorDefault,
  },
  /** No glyph, leaving the dash to carry the "no data" meaning. */
  unknown: { valueColor: TextColor.TextAlternative },
};

/**
 * The four contract checks, in render order.
 *
 * Shown on the Security tab under the Contract heading, and repeated at the
 * top of the Contract security screen. See `ContractCheckKey` for why the list
 * no longer varies by chain.
 */
export const SECURITY_CONTRACT_CHECKS: readonly ContractCheckKey[] = [
  ContractCheckKey.NoHoneypot,
  ContractCheckKey.ContractVerified,
  ContractCheckKey.Renounced,
  ContractCheckKey.NoBlacklist,
];

/**
 * The "Additional checks" group, in render order.
 *
 * Only reachable from the Contract security screen — the tab shows the four
 * contract checks and a chevron, not all seven.
 */
export const SECURITY_ADDITIONAL_CHECKS: readonly AdditionalCheckKey[] = [
  AdditionalCheckKey.NoMint,
  AdditionalCheckKey.RugPullRisk,
  AdditionalCheckKey.ContractControls,
];

/** Label beside each contract check. */
export const SECURITY_CHECK_LABEL_KEYS: Record<SecurityCheckKey, string> = {
  [ContractCheckKey.NoHoneypot]:
    'token_details_v1.security_tab.checks.no_honeypot',
  [ContractCheckKey.ContractVerified]:
    'token_details_v1.security_tab.checks.contract_verified',
  [ContractCheckKey.Renounced]:
    'token_details_v1.security_tab.checks.renounced',
  [ContractCheckKey.NoBlacklist]:
    'token_details_v1.security_tab.checks.no_blacklist',
  [AdditionalCheckKey.NoMint]: 'token_details_v1.security_tab.checks.no_mint',
  [AdditionalCheckKey.RugPullRisk]:
    'token_details_v1.security_tab.checks.rug_pull_risk',
  [AdditionalCheckKey.ContractControls]:
    'token_details_v1.security_tab.checks.contract_controls',
};

/**
 * Sentence printed under each row on the Contract security screen.
 *
 * The four contract checks point at the same copy as their explainer sheets:
 * the screen states the definition inline where the tab hides it behind a tap,
 * but it is the same definition, so pointing both at one key is what stops the
 * two surfaces defining a term differently.
 *
 * The additional checks have no sheet, so these are their only definitions.
 */
export const SECURITY_CHECK_DESCRIPTION_KEYS: Record<SecurityCheckKey, string> =
  {
    [ContractCheckKey.NoHoneypot]:
      'token_details_v1.security_tab.explainers.no_honeypot.description',
    [ContractCheckKey.ContractVerified]:
      'token_details_v1.security_tab.explainers.contract_verified.description',
    [ContractCheckKey.Renounced]:
      'token_details_v1.security_tab.explainers.renounced.description',
    [ContractCheckKey.NoBlacklist]:
      'token_details_v1.security_tab.explainers.no_blacklist.description',
    [AdditionalCheckKey.NoMint]:
      'token_details_v1.security_tab.check_descriptions.no_mint',
    [AdditionalCheckKey.RugPullRisk]:
      'token_details_v1.security_tab.check_descriptions.rug_pull_risk',
    [AdditionalCheckKey.ContractControls]:
      'token_details_v1.security_tab.check_descriptions.contract_controls',
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
  [SecurityStatKey.ListedOnExchange]:
    'token_details_v1.security_tab.stats.listed_on_exchange',
  [SecurityStatKey.Created]: 'token_details_v1.security_tab.stats.created',
};

/**
 * Copy for the explainer sheet behind each row's dotted underline.
 *
 * Keyed by every row the tab can render, so a row added later cannot ship
 * without a definition. Titles are separate from the row labels because a row
 * abbreviates to fit its line (`Liq/MC`, `Top 10`) while the sheet spells the
 * term out.
 *
 * `SecurityRowKey` excludes the additional checks: those render only on the
 * Contract security screen, with their definition inline, so an entry here
 * would be copy nothing ever opens.
 */
export const SECURITY_EXPLAINER_KEYS: Record<
  SecurityRowKey,
  { title: string; description: string }
> = {
  [ContractCheckKey.NoHoneypot]: {
    title: 'token_details_v1.security_tab.explainers.no_honeypot.title',
    description:
      'token_details_v1.security_tab.explainers.no_honeypot.description',
  },
  [ContractCheckKey.ContractVerified]: {
    title: 'token_details_v1.security_tab.explainers.contract_verified.title',
    description:
      'token_details_v1.security_tab.explainers.contract_verified.description',
  },
  [ContractCheckKey.Renounced]: {
    title: 'token_details_v1.security_tab.explainers.renounced.title',
    description:
      'token_details_v1.security_tab.explainers.renounced.description',
  },
  [ContractCheckKey.NoBlacklist]: {
    title: 'token_details_v1.security_tab.explainers.no_blacklist.title',
    description:
      'token_details_v1.security_tab.explainers.no_blacklist.description',
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
  [SecurityStatKey.ListedOnExchange]: {
    title: 'token_details_v1.security_tab.explainers.listed_on_exchange.title',
    description:
      'token_details_v1.security_tab.explainers.listed_on_exchange.description',
  },
  [SecurityStatKey.Created]: {
    title: 'token_details_v1.security_tab.explainers.created.title',
    description: 'token_details_v1.security_tab.explainers.created.description',
  },
};
