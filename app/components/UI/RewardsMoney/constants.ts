import type { EarningOriginType } from '../../../core/Engine/controllers/rewards-money-controller/types';

/**
 * Local feature flag, off by default.
 *
 * The referral-program backend is not deployed anywhere the app points at yet,
 * so this is a build-time constant rather than a remote flag — there is nothing
 * for a remote flag to turn on. Flip it (or set `MM_REWARDS_MONEY_ENABLED`) to
 * exercise the surface against a local backend.
 */
export const REWARDS_MONEY_ENABLED =
  process.env.MM_REWARDS_MONEY_ENABLED === 'true';

/**
 * The origin-type scope each variant reads. This single prop is the whole
 * difference between the referrer's and the referee's earnings half.
 */
export const REFERRER_ORIGIN_TYPES: EarningOriginType[] = [
  'CASHBACK',
  'REFERRAL_REV_SHARE',
];

export const REFEREE_ORIGIN_TYPES: EarningOriginType[] = ['CASHBACK'];

export const REWARDS_MONEY_TEST_IDS = {
  VIEW: 'rewards-money-view',
  LOADING: 'rewards-money-loading',
  ERROR: 'rewards-money-error',
  REFERRAL_VIEW: 'rewards-money-referral-view',
  REFERRAL_CODE_CARD: 'rewards-money-referral-code-card',
  REFERRAL_CODE_VALUE: 'rewards-money-referral-code-value',
  REFERRAL_RATES_ROW: 'rewards-money-referral-rates-row',
  REFERRAL_REVSHARE_RATE: 'rewards-money-referral-revshare-rate',
  REFERRAL_CASHBACK_RATE: 'rewards-money-referral-cashback-rate',
  SHARE_LINK_BUTTON: 'rewards-money-share-link-button',
  ENTRY_STATE: 'rewards-money-entry-state',
  EARNINGS_CTA: 'rewards-money-earnings-cta',
  EARNINGS_VIEW: 'rewards-money-earnings-view',
  EARNINGS_SUMMARY_HEADER: 'rewards-money-earnings-summary-header',
  EARNINGS_CLAIMABLE: 'rewards-money-earnings-claimable',
  EARNINGS_PENDING: 'rewards-money-earnings-pending',
  EARNINGS_CLAIMED: 'rewards-money-earnings-claimed',
  EARNINGS_TABS: 'rewards-money-earnings-tabs',
  EARNINGS_TAB_PLACEHOLDER: 'rewards-money-earnings-tab-placeholder',
  LEDGER_LIST: 'rewards-money-ledger-list',
  LEDGER_EMPTY: 'rewards-money-ledger-empty',
  LEDGER_SKELETON: 'rewards-money-ledger-skeleton',
  CLAIM_CTA: 'rewards-money-claim-cta',
  CLAIM_SHEET: 'rewards-money-claim-sheet',
  CLAIM_SHEET_AMOUNT: 'rewards-money-claim-sheet-amount',
  CLAIM_SHEET_PARTIAL_NOTICE: 'rewards-money-claim-sheet-partial-notice',
  CLAIM_SHEET_BLOCKED_NOTICE: 'rewards-money-claim-sheet-blocked-notice',
  CLAIM_SHEET_IN_PROGRESS: 'rewards-money-claim-sheet-in-progress',
  CLAIM_SHEET_CONFIRM: 'rewards-money-claim-sheet-confirm',
} as const;

/**
 * How long the sheet stays locked with no response before dismissal is
 * re-enabled. Shorter than the 60s voucher window so a wedged request never
 * traps the user for the whole of it.
 */
export const CLAIM_WATCHDOG_MS = 10_000;
