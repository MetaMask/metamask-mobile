import { ethers } from 'ethers';
import balanceScannerAbi from './sdk/balanceScannerAbi.json';
import { CardNetwork, CardNetworkInfo } from './types';
import { CaipChainId } from '@metamask/utils';

const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

export const LINEA_MAINNET_RPC_URL = `https://linea-mainnet.infura.io/v3/${infuraProjectId}`;
export const BASE_MAINNET_RPC_URL = `https://base-mainnet.infura.io/v3/${infuraProjectId}`;
export const BALANCE_SCANNER_ABI =
  balanceScannerAbi as ethers.ContractInterface;
export const ARBITRARY_ALLOWANCE = 100000000000;
export const DEPOSIT_SUPPORTED_TOKENS = ['USDC', 'USDT', 'mUSD'];
export const BAANX_MAX_LIMIT = '2199023255551';
export const AUTHENTICATED_CACHE_DURATION = 60 * 1000;
export const UNAUTHENTICATED_CACHE_DURATION = 5 * 60 * 1000;
export const SUPPORTED_ASSET_NETWORKS: CardNetwork[] = [
  'linea',
  'solana',
  'base',
];
export const CARD_SUPPORT_EMAIL = 'metamask@cl-cards.com';

export const cardNetworkInfos: Record<CardNetwork, CardNetworkInfo> = {
  linea: {
    caipChainId: 'eip155:59144',
    rpcUrl: LINEA_MAINNET_RPC_URL,
  },
  base: {
    caipChainId: 'eip155:8453',
    rpcUrl: BASE_MAINNET_RPC_URL,
  },
  solana: {
    caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
};

export const caipChainIdToNetwork: Record<CaipChainId, CardNetwork> = {
  'eip155:59144': 'linea',
  'eip155:8453': 'base',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'solana',
};

/**
 * Tokens that don't support the spending limit progress bar feature.
 * These tokens have different allowance behavior and we cannot reliably
 * track the total allowance from approval logs.
 * Format: Token symbols in uppercase
 */
export const SPENDING_LIMIT_UNSUPPORTED_TOKENS = ['AUSDC'];
