import { CaipChainId } from '@metamask/utils';
import {
  isBtcMainnetAddress,
  isBtcTestnetAddress,
  isSolanaAddress,
} from './utils';
import {
  BtcAccountType,
  BtcScope,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import BTC from '../../images/bitcoin-logo.png';
import SOL from '../../images/solana-logo.png';

export const EVM_IDENTIFIER = 'eip155';

// Image imports for React Native rendering
export const MULTICHAIN_TOKEN_IMAGES = {
  [BtcScope.Mainnet]: BTC,
  [SolScope.Mainnet]: SOL,
  [BtcScope.Testnet]: BTC,
  [SolScope.Devnet]: SOL,
  [SolScope.Testnet]: SOL,
} as const;

export interface ProviderConfigWithImageUrl {
  rpcUrl?: string;
  type: string;
  ticker: string;
  decimal: number;
  nickname?: string;
  rpcPrefs?: { blockExplorerUrl?: string };
  id?: string;
}

export type MultichainProviderConfig = ProviderConfigWithImageUrl & {
  nickname: string;
  chainId: CaipChainId;
  // NOTE: For now we use a callback to check if the address is compatible with
  // the given network or not
  isAddressCompatible: (address: string) => boolean;
};

export const MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET = {
  [BtcAccountType.P2wpkh]: BtcScope.Mainnet,
  [SolAccountType.DataAccount]: SolScope.Mainnet,
} as const;

export const MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP = {
  [BtcScope.Mainnet]: 'https://blockstream.info/address',
  [BtcScope.Testnet]: 'https://blockstream.info/testnet/address',
  [SolScope.Mainnet]: 'https://explorer.solana.com/',
  [SolScope.Devnet]: 'https://explorer.solana.com/?cluster=devnet',
  [SolScope.Testnet]: 'https://explorer.solana.com/?cluster=testnet',
} as const;

export const MULTICHAIN_PROVIDER_CONFIGS: Record<
  CaipChainId,
  MultichainProviderConfig
> = {
  [BtcScope.Mainnet]: {
    chainId: BtcScope.Mainnet,
    rpcUrl: '', // not used
    ticker: 'BTC',
    nickname: 'Bitcoin',
    id: 'btc-mainnet',
    type: 'rpc',
    decimal: 8,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[BtcScope.Mainnet],
    },
    isAddressCompatible: isBtcMainnetAddress,
  },
  [BtcScope.Testnet]: {
    chainId: BtcScope.Testnet,
    rpcUrl: '', // not used
    ticker: 'BTC',
    nickname: 'Bitcoin (testnet)',
    id: 'btc-testnet',
    type: 'rpc',
    decimal: 8,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[BtcScope.Testnet],
    },
    isAddressCompatible: isBtcTestnetAddress,
  },
  /**
   * Solana
   */
  [SolScope.Mainnet]: {
    chainId: SolScope.Mainnet,
    rpcUrl: '', // not used
    ticker: 'SOL',
    nickname: 'Solana',
    id: 'solana-mainnet',
    type: 'rpc',
    decimal: 9,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[SolScope.Mainnet],
    },
    isAddressCompatible: isSolanaAddress,
  },
  [SolScope.Devnet]: {
    chainId: SolScope.Devnet,
    rpcUrl: '', // not used
    ticker: 'SOL',
    nickname: 'Solana (devnet)',
    id: 'solana-devnet',
    type: 'rpc',
    decimal: 9,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[SolScope.Devnet],
    },
    isAddressCompatible: isSolanaAddress,
  },
  [SolScope.Testnet]: {
    chainId: SolScope.Testnet,
    rpcUrl: '', // not used
    ticker: 'SOL',
    nickname: 'Solana (testnet)',
    id: 'solana-testnet',
    type: 'rpc',
    decimal: 9,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[SolScope.Testnet],
    },
    isAddressCompatible: isSolanaAddress,
  },
};
