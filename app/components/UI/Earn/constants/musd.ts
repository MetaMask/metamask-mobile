/**
 * mUSD Conversion Constants for Earn namespace
 */

import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import MusdIcon from '../../../../images/musd-icon-2x.png';
import { areAddressesEqual } from '../../../../util/address';

export const MUSD_TOKEN = {
  symbol: 'MUSD',
  name: 'MUSD',
  decimals: 6,
  imageSource: MusdIcon,
} as const;

/**
 * mUSD token decimals (derived from MUSD_TOKEN for single source of truth)
 */
export const MUSD_DECIMALS = MUSD_TOKEN.decimals;

export const MUSD_CONVERSION_DEFAULT_CHAIN_ID = CHAIN_IDS.MAINNET;

/**
 * mUSD token address (same on all supported chains)
 */
export const MUSD_TOKEN_ADDRESS: Hex =
  '0xaca92e438df0b2401ff60da7e4337b687a2435da';

export const MUSD_TOKEN_ADDRESS_BY_CHAIN: Record<Hex, Hex> = {
  [CHAIN_IDS.MAINNET]: MUSD_TOKEN_ADDRESS,
  [CHAIN_IDS.LINEA_MAINNET]: MUSD_TOKEN_ADDRESS,
  [CHAIN_IDS.BSC]: MUSD_TOKEN_ADDRESS,
};

/**
 * Chains where mUSD CTA should show (buy routes available).
 * BSC is excluded as buy routes are not yet available.
 */
export const MUSD_BUYABLE_CHAIN_IDS: Hex[] = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
  // CHAIN_IDS.BSC, // TODO: Uncomment once buy routes are available
];

export const MUSD_TOKEN_ASSET_ID_BY_CHAIN: Record<Hex, string> = {
  [CHAIN_IDS.MAINNET]:
    'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  [CHAIN_IDS.LINEA_MAINNET]:
    'eip155:59144/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  [CHAIN_IDS.BSC]: 'eip155:56/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
};

export const MUSD_CURRENCY = 'MUSD';
export const MUSD_CONVERSION_APY = 3;

// Delay before cleaning up toast tracking entries after final transaction status
export const TOAST_TRACKING_CLEANUP_DELAY_MS = 5000;

/**
 * Default blocked countries for mUSD conversion when no remote or env config is available.
 * This is a safety fallback to ensure geo-blocking is always active.
 */
export const DEFAULT_MUSD_BLOCKED_COUNTRIES = ['GB'];

/**
 * Parameters for checking if a transaction is a mUSD claim for the current view.
 */
export interface IsMusdClaimForCurrentViewParams {
  /** Transaction to check */
  tx: {
    type?: TransactionType;
    status?: string;
    chainId?: Hex;
  };
  /** Token address being viewed (should be lowercased or checksummed) */
  navAddress: string;
  /** Token symbol being viewed (should be lowercased) */
  navSymbol: string;
  /** Current chain ID */
  chainId: Hex;
}

/**
 * Check if transaction is a Merkl mUSD yield claim that should be shown in current view.
 * These transactions interact with the Merkl distributor contract (not the mUSD token directly),
 * so they won't be caught by standard token transfer detection and need special handling.
 *
 * @param params - The parameters for the check
 * @returns true if the transaction should be shown in the current mUSD view
 */
export function isMusdClaimForCurrentView({
  tx,
  navAddress,
  navSymbol,
  chainId,
}: IsMusdClaimForCurrentViewParams): boolean {
  const isMusdView =
    areAddressesEqual(navAddress, MUSD_TOKEN_ADDRESS) ||
    navSymbol === MUSD_TOKEN.symbol.toLowerCase();
  return (
    tx.type === TransactionType.musdClaim &&
    tx.status !== 'unapproved' &&
    isMusdView &&
    chainId === tx.chainId
  );
}
