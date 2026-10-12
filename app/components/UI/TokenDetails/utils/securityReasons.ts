import type { TokenSecurityFeature } from '@metamask/assets-controllers';

import { strings } from '../../../../../locales/i18n';
import type { SecurityVerdict } from '../components/V1/SecurityPill/SecurityPill';

/**
 * One line under "Additional checks", naming something Blockaid actually found.
 *
 * The featureId travels with the label so the list can be keyed and asserted
 * on without matching translated copy.
 */
export interface SecurityReason {
  featureId: string;
  label: string;
}

/**
 * Which feature types explain each verdict.
 *
 * `Info` appears in no bucket, and that is the whole point of this table.
 * Blockaid uses `Info` for "the contract can do this" regardless of whether
 * the capability is good or bad: Coinbase Wrapped XRP comes back `Verified`
 * with `IS_MINTABLE`, `CAN_BLACKLIST`, `PROXY_CONTRACT`, `EXTERNAL_FUNCTIONS`
 * and `OWNERSHIP_RENOUNCED` all typed `Info`. Listing that bucket under a
 * screened token would offer "can blacklist" as a reason it is safe.
 *
 * `Benign`, `Warning`, `Spam` and `Malicious` do carry polarity, so those are
 * trusted as they arrive.
 *
 * TODO(product-safety): `Spam` and `Malicious` never appeared across 200
 * sampled tokens, both being bad-token-only. Treating them as negative is
 * reasoned from Blockaid's docs rather than observed.
 */
const REASON_FEATURE_TYPES: Record<SecurityVerdict, readonly string[]> = {
  high_risk: ['Malicious'],
  medium_risk: ['Warning', 'Spam'],
  screened: ['Benign'],
  /** Neither verdict has a payload to explain. */
  unscreened: [],
  pending: [],
};

/**
 * Display copy per featureId, so Blockaid's raw English never reaches a screen.
 *
 * Most entries point at `security_trust.features.*`, which the legacy token
 * details page already ships translated in every supported language. Reusing
 * those keys rather than minting new ones is what keeps this list from being
 * English-only on day one. Only ids the legacy map never knew about get a new
 * key under `token_details_v1.security_tab.reasons`.
 *
 * Note this is a coupling to the legacy locale namespace, not to its code —
 * `securityUtils.ts` is deliberately not imported, since its hardcoded type
 * per featureId is the thing the API's own type replaces here.
 *
 * Ids typed `Info` today are kept even though no bucket selects them, because
 * Blockaid has been observed retyping an id between chains and a label costs
 * nothing until it is needed.
 *
 * Keeping this current matters more than it looks: `countSecurityFlags` is the
 * length of the list this map gates, so a missing id does not merely go
 * unlabelled, it lowers the number on the pill. The legacy map in
 * `SecurityTrust` fell 13 ids behind without anyone noticing, which is the
 * failure this one has to avoid.
 */
const REASON_LABEL_KEYS: Readonly<Record<string, string>> = {
  // Positive signals the legacy map already covers.
  HIGH_REPUTATION_TOKEN:
    'security_trust.features.positive.high_reputation_token',
  LISTED_ON_CENTRALIZED_EXCHANGE:
    'security_trust.features.positive.listed_on_centralized_exchange',
  VERIFIED_CONTRACT: 'security_trust.features.positive.verified_contract',
  HIGH_TRADE_VOLUME: 'security_trust.features.positive.high_trade_volume',

  // Positive signals the legacy map has never seen.
  OWNERSHIP_RENOUNCED:
    'token_details_v1.security_tab.reasons.ownership_renounced',
  SIGNIFICANT_USD_RESERVES:
    'token_details_v1.security_tab.reasons.significant_usd_reserves',
  CREATED_VIA_LAUNCHPAD:
    'token_details_v1.security_tab.reasons.created_via_launchpad',
  DEX_PAID: 'token_details_v1.security_tab.reasons.dex_paid',
  LOW_DEV_PERCENTAGE:
    'token_details_v1.security_tab.reasons.low_dev_percentage',
  LOW_SNIPERS_PERCENTAGE:
    'token_details_v1.security_tab.reasons.low_snipers_percentage',
  LOW_INITIAL_SNIPERS_PERCENTAGE:
    'token_details_v1.security_tab.reasons.low_initial_snipers_percentage',
  LOW_INSIDERS_PERCENTAGE:
    'token_details_v1.security_tab.reasons.low_insiders_percentage',
  LOW_BUNDLERS_PERCENTAGE:
    'token_details_v1.security_tab.reasons.low_bundlers_percentage',

  // Negative signals the legacy map has never seen.
  HIGH_DEV_PERCENTAGE:
    'token_details_v1.security_tab.reasons.high_dev_percentage',
  HIGH_INITIAL_SNIPERS_PERCENTAGE:
    'token_details_v1.security_tab.reasons.high_initial_snipers_percentage',
  /**
   * Also read by `securityChecks.ts` to fail the "Contract verified" row. A
   * label is still needed here, since failing that row does not explain the
   * flag count — the two surfaces answer different questions.
   */
  UNVERIFIED_CONTRACT:
    'token_details_v1.security_tab.reasons.unverified_contract',

  // Malicious.
  HIGH_BUY_FEE: 'security_trust.features.negative.high_buy_fee',
  HIGH_SELL_FEE: 'security_trust.features.negative.high_sell_fee',
  HIGH_TRANSFER_FEE: 'security_trust.features.negative.high_transfer_fee',
  IMPERSONATOR_SENSITIVE_ASSET:
    'security_trust.features.negative.impersonator_sensitive_asset',
  KNOWN_MALICIOUS: 'security_trust.features.negative.known_malicious',
  METADATA: 'security_trust.features.negative.metadata',
  POST_DUMP: 'security_trust.features.negative.post_dump',
  RUGPULL: 'security_trust.features.negative.rugpull',
  SANCTIONED_CREATOR: 'security_trust.features.negative.sanctioned_creator',
  SIMILAR_MALICIOUS_CONTRACT:
    'security_trust.features.negative.similar_malicious_contract',
  STATIC_CODE_SIGNATURE:
    'security_trust.features.negative.static_code_signature',
  TOKEN_BACKDOOR: 'security_trust.features.negative.token_backdoor',
  UNSELLABLE_TOKEN: 'security_trust.features.negative.unsellable_token',

  // Spam.
  IMPERSONATOR_HIGH_CONFIDENCE:
    'security_trust.features.negative.impersonator_high_confidence',
  IMPERSONATOR_MEDIUM_CONFIDENCE:
    'security_trust.features.negative.impersonator_medium_confidence',

  // Warning.
  AIRDROP_PATTERN: 'security_trust.features.negative.airdrop_pattern',
  CONCENTRATED_SUPPLY_DISTRIBUTION:
    'security_trust.features.negative.concentrated_supply_distribution',
  DYNAMIC_ANALYSIS: 'security_trust.features.negative.dynamic_analysis',
  FAKE_TRADE_MAKER_COUNT:
    'security_trust.features.negative.fake_trade_maker_count',
  FAKE_VOLUME: 'security_trust.features.negative.fake_volume',
  HEAVILY_SNIPED: 'security_trust.features.negative.heavily_sniped',
  HIDDEN_SUPPLY_BY_KEY_HOLDER:
    'security_trust.features.negative.hidden_supply_by_key_holder',
  HONEYPOT: 'security_trust.features.negative.honeypot',
  IMPERSONATOR: 'security_trust.features.negative.impersonator',
  INAPPROPRIATE_CONTENT:
    'security_trust.features.negative.inappropriate_content',
  INORGANIC_VOLUME: 'security_trust.features.negative.inorganic_volume',
  INSUFFICIENT_LOCKED_LIQUIDITY:
    'security_trust.features.negative.insufficient_locked_liquidity',
  LOW_REPUTATION_CREATOR:
    'security_trust.features.negative.low_reputation_creator',
  SNIPE_AT_MINT: 'security_trust.features.negative.snipe_at_mint',
  SPAM_TEXT: 'security_trust.features.negative.spam_text',
  UNSTABLE_TOKEN_PRICE: 'security_trust.features.negative.unstable_token_price',
  WASH_TRADING: 'security_trust.features.negative.wash_trading',

  // Capability signals. No bucket selects these today; see the note above.
  CAN_BLACKLIST: 'security_trust.features.negative.can_blacklist',
  CAN_WHITELIST: 'security_trust.features.negative.can_whitelist',
  CONFIDENTIAL_TRANSFERS_ENABLED:
    'security_trust.features.negative.confidential_transfers_enabled',
  EXTERNAL_FUNCTIONS: 'security_trust.features.negative.external_functions',
  HAS_TRADING_COOLDOWN: 'security_trust.features.negative.has_trading_cooldown',
  HIDDEN_OWNER: 'security_trust.features.negative.hidden_owner',
  IMPERSONATOR_LOW_CONFIDENCE:
    'security_trust.features.negative.impersonator_low_confidence',
  IS_MINTABLE: 'security_trust.features.negative.is_mintable',
  MODIFIABLE_TAXES: 'security_trust.features.negative.modifiable_taxes',
  NON_TRANSERABLE: 'security_trust.features.negative.non_transerable',
  OWNER_CAN_CHANGE_BALANCE:
    'security_trust.features.negative.owner_can_change_balance',
  PROXY_CONTRACT: 'security_trust.features.negative.proxy_contract',
  TRANSFER_FROM_REVERTS:
    'security_trust.features.negative.transfer_from_reverts',
  TRANSFER_HOOK_ENABLED:
    'security_trust.features.negative.transfer_hook_enabled',
  TRANSFER_PAUSEABLE: 'security_trust.features.negative.transfer_pauseable',
};

/**
 * Features that explain the verdict, in the order the API returned them.
 *
 * An id with no entry in the label map is dropped rather than rendered with
 * Blockaid's own English, which is written for an API consumer and not for
 * this screen. The API ships new ids faster than the map grows — 13 of the 35
 * seen across 200 tokens were unknown to the legacy list — so this path is
 * ordinary rather than exceptional.
 */
export const resolveSecurityReasons = (
  features: readonly TokenSecurityFeature[],
  verdict: SecurityVerdict,
): SecurityReason[] => {
  const types = REASON_FEATURE_TYPES[verdict];

  return features.flatMap((feature) => {
    if (!types.includes(feature.type)) {
      return [];
    }
    const labelKey = REASON_LABEL_KEYS[feature.featureId];
    return labelKey
      ? [{ featureId: feature.featureId, label: strings(labelKey) }]
      : [];
  });
};

/**
 * How many flags the pill reports.
 *
 * Literally the length of the list rendered beneath the pill, rather than a
 * parallel filter that agrees with it. The two can only drift if they are
 * computed separately, so they are not: an id Blockaid flags but our label map
 * has no entry for is dropped from both, and the pill never promises a row it
 * cannot draw.
 *
 * The cost is that the count understates Blockaid's own flag total whenever an
 * id is unmapped. That is accepted on the grounds that a number nobody can act
 * on is worse than a smaller one, but it does mean `REASON_LABEL_KEYS` falling
 * behind the API now quietly lowers the count — see the note there.
 *
 * `medium_risk` rather than the token's own verdict because the pill only
 * renders a count for that one; the other verdicts have fixed labels.
 */
export const countSecurityFlags = (
  features: readonly TokenSecurityFeature[],
): number => resolveSecurityReasons(features, 'medium_risk').length;
