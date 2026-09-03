import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

/**
 * Chains on which wallet-held mUSD counts toward the VIP equity multiplier
 * estimate.
 *
 * Deliberately hard-coded and owned by Rewards rather than read from Earn's
 * `earnMusdBalanceChainIds` remote feature flag. That flag belongs to another
 * team and `MUSD_TOKEN_ADDRESS_BY_CHAIN` already resolves mUSD on further
 * chains (e.g. BSC), so inheriting it would let an unrelated flag change
 * silently redefine what the VIP program counts as holdings.
 */
export const VIP_MUSD_HOLDINGS_CHAIN_IDS: readonly Hex[] = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
  CHAIN_IDS.MONAD,
];

/**
 * Chain the Money Account's mUSD and vmUSD live on.
 *
 * The Money Account balance endpoint returns
 * `totalBalance = musdBalance + vmusdValueInMusd`, where `musdBalance` is the
 * mUSD ERC-20 balance on this chain. Wallet-side summing must skip this
 * address/chain pair to avoid counting that mUSD twice.
 */
export const MONEY_ACCOUNT_MUSD_CHAIN_ID: Hex = CHAIN_IDS.MONAD;
