import {
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import {
  STAT_EXPLAINER_KEYS,
  TokenStatKey,
} from '../../../constants/tokenStats';
import { CONTRACT_CHECKS } from '../../../utils/securityFacts';
import type { ExplainerCopy } from '../TokenExplainerSheet/TokenExplainerSheet.types';
import {
  CONTRACT_CHECK_KEYS,
  ContractCheckKey,
  type SecurityCheckOutcome,
  type SecurityRowKey,
} from './SecurityTab.types';

/** Glyph and value colour for one check's row. */
interface CheckPresentation {
  icon?: { name: IconName; color: IconColor };
  valueColor: TextColor;
}

/**
 * How each check outcome presents.
 *
 * Shared by the tab and the Contract security screen rather than declared in
 * each: the screen is one tap from the tab and repeats the same five checks, so
 * a fork here would show the same check as passing in two different colours.
 *
 * Typed as a full `Record` so a fourth outcome cannot be added to
 * `SecurityCheckOutcome` without deciding how it looks.
 */
export const CHECK_OUTCOME_PRESENTATION: Record<
  SecurityCheckOutcome,
  CheckPresentation
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
 * How one check's row presents, outcome and tone together.
 *
 * Reads the tone straight off `CONTRACT_CHECKS` so neither render site has to
 * know that a check without a pass/fail glyph exists. A `neutral` row answers
 * its question in plain text — see `ContractCheck.tone` for why `is_mintable`
 * is the one check that cannot wear a tick or a cross.
 */
export const resolveCheckPresentation = (
  checkKey: ContractCheckKey,
  outcome: SecurityCheckOutcome,
): CheckPresentation =>
  CONTRACT_CHECKS[checkKey].tone === 'neutral'
    ? { valueColor: TextColor.TextDefault }
    : CHECK_OUTCOME_PRESENTATION[outcome];

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

/**
 * Every locale key belonging to a contract check, built from the check key.
 *
 * Interpolated rather than listed in a map per key family, because each of
 * those maps only ever restated this naming convention — one that
 * `resolveValue` in `securityFacts.ts` already follows for the pass and fail
 * wording. What that gives up is the `Record<ContractCheckKey, string>` that
 * failed to compile when a check shipped without copy; what replaces it is a
 * test resolving every key below against `en.json`, which is strictly
 * stronger, since a `Record` only ever proved somebody wrote *a* string.
 *
 * The flip side is that these keys are now unsearchable from `en.json`. Adding
 * a sixth check therefore means adding its block under `checks`,
 * `check_values` and `explainers` by hand; the locale test is what tells you
 * which one you forgot.
 */
export const checkLabelKey = (checkKey: ContractCheckKey): string =>
  `token_details_v1.security_tab.checks.${checkKey}`;

/**
 * Sentence printed under each row on the Contract security screen.
 *
 * The same key the explainer sheet uses: the screen states the definition
 * inline where the tab hides it behind a tap, but it is the same definition,
 * so one key is what stops the two surfaces defining a term differently.
 */
export const checkDescriptionKey = (checkKey: ContractCheckKey): string =>
  `token_details_v1.security_tab.explainers.${checkKey}.description`;

const checkExplainerKeys = (checkKey: ContractCheckKey): ExplainerCopy => ({
  title: `token_details_v1.security_tab.explainers.${checkKey}.title`,
  description: checkDescriptionKey(checkKey),
});

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
 * Copy for every definition sheet either surface can open.
 *
 * One map over both halves of `SecurityRowKey`, so the screen that owns the
 * sheet needs a single handler rather than one per surface plus a way to tell
 * a check key from a stat key.
 *
 * Only the contract half is derived. The stat keys stay written out in
 * `STAT_EXPLAINER_KEYS` because they are shared with the stat bar, whose keys
 * follow no single pattern off the stat key.
 */
export const EXPLAINER_KEYS_BY_ROW: Record<SecurityRowKey, ExplainerCopy> = {
  ...CONTRACT_CHECK_KEYS.reduce(
    (explainers, checkKey) => {
      explainers[checkKey] = checkExplainerKeys(checkKey);
      return explainers;
    },
    {} as Record<ContractCheckKey, ExplainerCopy>,
  ),
  ...STAT_EXPLAINER_KEYS,
};
