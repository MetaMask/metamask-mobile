/**
 * mUSD Conversion Constants for Earn namespace
 *
 * Shared constants and guards live in `@metamask/money-account-utils`
 * (currently consumed as the `@metamask-previews/money-account-utils` preview
 * build until the first real release) and are re-exported here so existing
 * import paths keep working. Client-specific presentation (icon asset) and
 * configuration stay local.
 */

import { MUSD_TOKEN as MUSD_TOKEN_BASE } from '@metamask-previews/money-account-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import MusdIcon from '../../../../images/musd-icon-2x.png';

export {
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
  MUSD_CURRENCY,
  MUSD_MONEY_ACCOUNT_CHAIN_IDS,
  isMusdToken,
  getTokenDisplaySymbol,
  isMusdTokenOnChain,
  isMusdOnMoneyAccountChain,
} from '@metamask-previews/money-account-utils';

export const MUSD_TOKEN = {
  ...MUSD_TOKEN_BASE,
  imageSource: MusdIcon,
} as const;

export const MUSD_CONVERSION_DEFAULT_CHAIN_ID = CHAIN_IDS.MAINNET;

/**
 * Chains where mUSD CTA should show (buy routes available).
 * BSC is excluded as buy routes are not yet available.
 */
export const MUSD_BUYABLE_CHAIN_IDS: Hex[] = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
  // CHAIN_IDS.BSC, // TODO: Uncomment once buy routes are available
];
export const MUSD_CONVERSION_APY = 3;

// Delay before cleaning up toast tracking entries after final transaction status
export const TOAST_TRACKING_CLEANUP_DELAY_MS = 5000;

/**
 * Default blocked countries for mUSD conversion when no remote or env config is available.
 * This is a safety fallback to ensure geo-blocking is always active.
 */
export const DEFAULT_MUSD_BLOCKED_COUNTRIES = ['GB'];
