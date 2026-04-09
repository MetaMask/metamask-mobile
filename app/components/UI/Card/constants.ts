import { ethers } from 'ethers';
import balanceScannerAbi from './sdk/balanceScannerAbi.json';
import { CardNetwork, CardNetworkInfo } from './types';
import { CaipChainId } from '@metamask/utils';

const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

export const LINEA_MAINNET_RPC_URL = `https://linea-mainnet.infura.io/v3/${infuraProjectId}`;
export const BASE_MAINNET_RPC_URL = `https://base-mainnet.infura.io/v3/${infuraProjectId}`;
export const MONAD_MAINNET_RPC_URL = `https://monad-mainnet.infura.io/v3/${infuraProjectId}`;
export const COINME_TERMS_URL = 'https://coinme.com/legal/';
export const CRB_TERMS_URL =
  'https://baanx-public.s3-eu-west-1.amazonaws.com/Ledger/public-files/BaanxUS_CLCard_TOS.undefined-fddb292f91ce3.pdf';
export const CRB_ACCOUNT_OPENING_URL =
  'https://secure.baanx.co.uk/BAANX_US_ACCOUNT_OPENING_AGREEMENTS_AND_DISCLOSURES_08152025.pdf';
export const CRB_PRIVACY_NOTICE_URL =
  'https://secure.baanx.co.uk/Baanx_(CL)_U.S._Privacy_Notice_06.2025.pdf';
export const CRB_PRIVACY_POLICY_URL =
  'https://www.crossriver.com/legal/privacy-notice';
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
  'monad',
];
export const CARD_SUPPORT_EMAIL = 'metamask@cl-cards.com';
export const HUBSPOT_WAITLIST_URL =
  'https://share.hsforms.com/1kNZXeod7TU2xEy0BxmQxJw2urwb';
export const NON_PRODUCTION_ENVIRONMENTS = [
  'e2e',
  'dev',
  'local',
  'pre-release',
  'exp',
  'beta',
];

export const cardNetworkInfos: Record<CardNetwork, CardNetworkInfo> = {
  linea: {
    caipChainId: 'eip155:59144',
    rpcUrl: LINEA_MAINNET_RPC_URL,
  },
  base: {
    caipChainId: 'eip155:8453',
    rpcUrl: BASE_MAINNET_RPC_URL,
  },
  monad: {
    caipChainId: 'eip155:143',
    rpcUrl: MONAD_MAINNET_RPC_URL,
  },
  solana: {
    caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
};

export const CARD_CHAIN_IDS = Object.values(cardNetworkInfos).map(
  (info) => info.caipChainId,
);

export const caipChainIdToNetwork = Object.fromEntries(
  Object.entries(cardNetworkInfos).map(([network, info]) => [
    info.caipChainId,
    network,
  ]),
) as Record<CaipChainId, CardNetwork>;

/**
 * Tokens that don't support the spending limit progress bar feature.
 * These tokens have different allowance behavior and we cannot reliably
 * track the total allowance from approval logs.
 * Format: Token symbols in uppercase
 */
export const SPENDING_LIMIT_UNSUPPORTED_TOKENS = ['AUSDC'];
