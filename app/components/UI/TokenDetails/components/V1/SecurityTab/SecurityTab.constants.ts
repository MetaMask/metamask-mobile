import {
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import {
  STAT_EXPLAINER_KEYS,
  TokenStatKey,
} from '../../../constants/tokenStats';
import type { ExplainerCopy } from '../TokenExplainerSheet/TokenExplainerSheet.types';
import {
  ContractCheckKey,
  type SecurityCheckOutcome,
  type SecurityRowKey,
} from './SecurityTab.types';

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
 * Which stats each section lists, in render order.
 *
 * The tab's whole row layout. Sections keep their own JSX because Holders
 * opens with the distribution bar, but the rows within each come from here, so
 * adding a row is one entry rather than an entry plus a block of markup.
 *
 * `satisfies` keeps the literal keys visible to `SecurityStatRowKey` below
 * while still enforcing that every entry names a real stat.
 */
export const SECURITY_SECTIONS = {
  holders: [TokenStatKey.Holders, TokenStatKey.Top10],
  liquidity: [
    TokenStatKey.Liquidity,
    TokenStatKey.LiquidityToMarketCap,
    TokenStatKey.LpBurnedLocked,
    TokenStatKey.PrimaryPool,
  ],
  trading: [
    TokenStatKey.Tax,
    TokenStatKey.VolumeFlags,
    TokenStatKey.ListedOnExchange,
  ],
  origin: [TokenStatKey.Created],
} as const satisfies Record<string, readonly TokenStatKey[]>;

/**
 * Only the stats the tab actually lists.
 *
 * Derived rather than widened to `TokenStatKey` so the tab needs no label for
 * the four stats only the bar shows, while adding a key to a section above
 * still fails until it has one.
 */
export type SecurityStatRowKey =
  (typeof SECURITY_SECTIONS)[keyof typeof SECURITY_SECTIONS][number];

/** Label beside each contract check. */
export const SECURITY_CHECK_LABEL_KEYS: Record<ContractCheckKey, string> = {
  [ContractCheckKey.NoHoneypot]:
    'token_details_v1.security_tab.checks.no_honeypot',
  [ContractCheckKey.ContractVerified]:
    'token_details_v1.security_tab.checks.contract_verified',
  [ContractCheckKey.Renounced]:
    'token_details_v1.security_tab.checks.renounced',
  [ContractCheckKey.NoBlacklist]:
    'token_details_v1.security_tab.checks.no_blacklist',
};

/**
 * Sentence printed under each row on the Contract security screen.
 *
 * Points at the same copy as the explainer sheets: the screen states the
 * definition inline where the tab hides it behind a tap, but it is the same
 * definition, so pointing both at one key is what stops the two surfaces
 * defining a term differently.
 */
export const SECURITY_CHECK_DESCRIPTION_KEYS: Record<ContractCheckKey, string> =
  {
    [ContractCheckKey.NoHoneypot]:
      'token_details_v1.security_tab.explainers.no_honeypot.description',
    [ContractCheckKey.ContractVerified]:
      'token_details_v1.security_tab.explainers.contract_verified.description',
    [ContractCheckKey.Renounced]:
      'token_details_v1.security_tab.explainers.renounced.description',
    [ContractCheckKey.NoBlacklist]:
      'token_details_v1.security_tab.explainers.no_blacklist.description',
  };

/**
 * Label beside each stat row.
 *
 * Spelled out where the stat bar abbreviates, which is why the two surfaces
 * keep their own label maps. The definitions behind them do not differ, so the
 * explainer copy is shared — see `STAT_EXPLAINER_KEYS`.
 */
export const SECURITY_STAT_LABEL_KEYS: Record<SecurityStatRowKey, string> = {
  [TokenStatKey.Holders]: 'token_details_v1.security_tab.stats.holders',
  [TokenStatKey.Top10]: 'token_details_v1.security_tab.stats.top_ten',
  [TokenStatKey.Liquidity]:
    'token_details_v1.security_tab.stats.total_liquidity',
  [TokenStatKey.LiquidityToMarketCap]:
    'token_details_v1.security_tab.stats.liquidity_to_market_cap',
  [TokenStatKey.LpBurnedLocked]:
    'token_details_v1.security_tab.stats.lp_burned_locked',
  [TokenStatKey.PrimaryPool]:
    'token_details_v1.security_tab.stats.primary_pool',
  [TokenStatKey.Tax]: 'token_details_v1.security_tab.stats.buy_sell_tax',
  [TokenStatKey.VolumeFlags]:
    'token_details_v1.security_tab.stats.volume_flags',
  [TokenStatKey.ListedOnExchange]:
    'token_details_v1.security_tab.stats.listed_on_exchange',
  [TokenStatKey.Created]: 'token_details_v1.security_tab.stats.created',
};

/**
 * Copy for the explainer sheet behind each contract check's dotted underline.
 *
 * The stat rows' copy lives in `STAT_EXPLAINER_KEYS`, shared with the stat
 * bar. Only the checks are the tab's alone, because only the tab shows them.
 */
const CONTRACT_CHECK_EXPLAINER_KEYS: Record<ContractCheckKey, ExplainerCopy> = {
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
};

/**
 * Copy for every definition sheet either surface can open.
 *
 * One map over both halves of `SecurityRowKey`, so the screen that owns the
 * sheet needs a single handler rather than one per surface plus a way to tell
 * a check key from a stat key. Typed as a full `Record`, which is what makes a
 * row unable to ship without a definition behind its dotted underline.
 */
export const EXPLAINER_KEYS_BY_ROW: Record<SecurityRowKey, ExplainerCopy> = {
  ...CONTRACT_CHECK_EXPLAINER_KEYS,
  ...STAT_EXPLAINER_KEYS,
};
