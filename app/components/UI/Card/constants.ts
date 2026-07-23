import { ethers } from 'ethers';
import balanceScannerAbi from './sdk/balanceScannerAbi.json';
import { CardNetwork, CardNetworkInfo } from './types';
import { CaipChainId } from '@metamask/utils';

const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId =
  !InfuraKey || InfuraKey === 'null' || InfuraKey === 'undefined'
    ? ''
    : InfuraKey;
export const LINEA_PUBLIC_RPC_URL = 'https://rpc.linea.build';

export const LINEA_MAINNET_RPC_URL = infuraProjectId
  ? `https://linea-mainnet.infura.io/v3/${infuraProjectId}`
  : LINEA_PUBLIC_RPC_URL;
export const BASE_MAINNET_RPC_URL = `https://base-mainnet.infura.io/v3/${infuraProjectId}`;
export const MONAD_MAINNET_RPC_URL = `https://monad-mainnet.infura.io/v3/${infuraProjectId}`;
export const BASE_SEPOLIA_RPC_URL = `https://base-sepolia.infura.io/v3/${infuraProjectId}`;
export const BASE_USDC_TOKEN_ADDRESS =
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const BASE_SEPOLIA_USDC_TOKEN_ADDRESS =
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

export const CARD_TOKEN_ICON_OVERRIDES: Record<string, string> = {
  [`eip155:84532:${BASE_SEPOLIA_USDC_TOKEN_ADDRESS.toLowerCase()}`]: `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/${BASE_USDC_TOKEN_ADDRESS.toLowerCase()}.png`,
};
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
export const IMMERSVE_SUPPORT_EMAIL = 'support@metamask.io';
export const IMMERSVE_TERMS_URL =
  'https://immersve.com/terms-and-conditions/uk/general-terms-of-use';
export const HUBSPOT_WAITLIST_URL =
  'https://share.hsforms.com/1kNZXeod7TU2xEy0BxmQxJw2urwb';
// Fixed sentinel Immersve redirects the user to when they exit the hosted KYC
// UI; the KYC webview watches for it to know onboarding-in-webview is done, and
// it is passed to spending-prerequisites as kycRedirectUrl.
export const KYC_REDIRECT_URL = 'https://metamask.io/card/kyc-complete';
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

// Immersve test funding network. Not a first-class card network, but its
// balance must flow through useTokensWithBalance, which only queries chains
// listed here.
export const IMMERSVE_BASE_SEPOLIA_CAIP_CHAIN_ID: CaipChainId = 'eip155:84532';

export const CARD_CHAIN_IDS = [
  ...Object.values(cardNetworkInfos).map((info) => info.caipChainId),
  IMMERSVE_BASE_SEPOLIA_CAIP_CHAIN_ID,
];

export const caipChainIdToNetwork = Object.fromEntries(
  Object.entries(cardNetworkInfos).map(([network, info]) => [
    info.caipChainId,
    network,
  ]),
) as Record<CaipChainId, CardNetwork>;

export const SOLANA_CAIP_CHAIN_ID = cardNetworkInfos.solana.caipChainId;

export const isEvmChain = (chainId: CaipChainId | undefined): boolean =>
  chainId?.startsWith('eip155:') ?? false;

export const isSolanaChain = (chainId: CaipChainId | undefined): boolean =>
  chainId === SOLANA_CAIP_CHAIN_ID;

/**
 * Tokens that don't support the spending limit progress bar feature.
 * These tokens have different allowance behavior and we cannot reliably
 * track the total allowance from approval logs.
 * Format: Token symbols in uppercase
 */
export const SPENDING_LIMIT_UNSUPPORTED_TOKENS = ['AUSDC', 'AMUSD'];

/**
 * Checks if a token supports the spending limit progress bar feature.
 * Returns false for tokens with non-standard allowance behavior.
 */
export const isSpendingLimitSupportedToken = (
  symbol: string | undefined,
): boolean => {
  if (!symbol) return false;
  return !SPENDING_LIMIT_UNSUPPORTED_TOKENS.includes(symbol.toUpperCase());
};
