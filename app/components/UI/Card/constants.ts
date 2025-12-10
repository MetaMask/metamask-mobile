import { ethers } from 'ethers';
import balanceScannerAbi from './sdk/balanceScannerAbi.json';

export const BALANCE_SCANNER_ABI =
  balanceScannerAbi as ethers.ContractInterface;
export const ARBITRARY_ALLOWANCE = 100000000000;
export const DEPOSIT_SUPPORTED_TOKENS = ['USDC', 'USDT', 'mUSD'];
export const BAANX_MAX_LIMIT = '2199023255551';
export const AUTHENTICATED_CACHE_DURATION = 60 * 1000;
export const UNAUTHENTICATED_CACHE_DURATION = 5 * 60 * 1000;
export const SUPPORTED_ASSET_NETWORKS = ['linea', 'linea-us', 'solana'];

/**
 * Tokens that don't support the spending limit progress bar feature.
 * These tokens have different allowance behavior and we cannot reliably
 * track the total allowance from approval logs.
 * Format: Token symbols in uppercase
 */
export const SPENDING_LIMIT_UNSUPPORTED_TOKENS = ['AUSDC'];
export const CARD_SUPPORT_EMAIL = 'metamask@cl-cards.com';
