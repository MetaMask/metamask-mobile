import { CaipChainId } from '@metamask/utils';
import {
  isBtcMainnetAddress,
  isBtcTestnetAddress,
  isSolanaAddress,
} from './utils';
import { MultichainNetworks } from '@metamask/assets-controllers';
import { BtcAccountType, SolAccountType } from '@metamask/keyring-api';
import BTC from '../../images/bitcoin-logo.png';
import SOL from '../../images/solana-logo.png';

// Image imports for React Native rendering
export const MULTICHAIN_TOKEN_IMAGES = {
  [MultichainNetworks.Bitcoin]: BTC,
  [MultichainNetworks.Solana]: SOL,
  [MultichainNetworks.BitcoinTestnet]: BTC,
  [MultichainNetworks.SolanaDevnet]: SOL,
  [MultichainNetworks.SolanaTestnet]: SOL,
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
  [BtcAccountType.P2wpkh]: MultichainNetworks.Bitcoin,
  [SolAccountType.DataAccount]: MultichainNetworks.Solana,
} as const;

export const MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP = {
  [MultichainNetworks.Bitcoin]: 'https://blockstream.info/address',
  [MultichainNetworks.BitcoinTestnet]:
    'https://blockstream.info/testnet/address',
  [MultichainNetworks.Solana]: 'https://explorer.solana.com/',
  [MultichainNetworks.SolanaDevnet]:
    'https://explorer.solana.com/?cluster=devnet',
  [MultichainNetworks.SolanaTestnet]:
    'https://explorer.solana.com/?cluster=testnet',
} as const;

export const MULTICHAIN_PROVIDER_CONFIGS: Record<
  CaipChainId,
  MultichainProviderConfig
> = {
  [MultichainNetworks.Bitcoin]: {
    chainId: MultichainNetworks.Bitcoin,
    rpcUrl: '', // not used
    ticker: 'BTC',
    nickname: 'Bitcoin',
    id: 'btc-mainnet',
    type: 'rpc',
    decimal: 8,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[MultichainNetworks.Bitcoin],
    },
    isAddressCompatible: isBtcMainnetAddress,
  },
  [MultichainNetworks.BitcoinTestnet]: {
    chainId: MultichainNetworks.BitcoinTestnet,
    rpcUrl: '', // not used
    ticker: 'BTC',
    nickname: 'Bitcoin (testnet)',
    id: 'btc-testnet',
    type: 'rpc',
    decimal: 8,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[
          MultichainNetworks.BitcoinTestnet
        ],
    },
    isAddressCompatible: isBtcTestnetAddress,
  },
  /**
   * Solana
   */
  [MultichainNetworks.Solana]: {
    chainId: MultichainNetworks.Solana,
    rpcUrl: '', // not used
    ticker: 'SOL',
    nickname: 'Solana',
    id: 'solana-mainnet',
    type: 'rpc',
    decimal: 9,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[MultichainNetworks.Solana],
    },
    isAddressCompatible: isSolanaAddress,
  },
  [MultichainNetworks.SolanaDevnet]: {
    chainId: MultichainNetworks.SolanaDevnet,
    rpcUrl: '', // not used
    ticker: 'SOL',
    nickname: 'Solana (devnet)',
    id: 'solana-devnet',
    type: 'rpc',
    decimal: 9,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[
          MultichainNetworks.SolanaDevnet
        ],
    },
    isAddressCompatible: isSolanaAddress,
  },
  [MultichainNetworks.SolanaTestnet]: {
    chainId: MultichainNetworks.SolanaTestnet,
    rpcUrl: '', // not used
    ticker: 'SOL',
    nickname: 'Solana (testnet)',
    id: 'solana-testnet',
    type: 'rpc',
    decimal: 9,
    rpcPrefs: {
      blockExplorerUrl:
        MULTICHAIN_NETWORK_BLOCK_EXPLORER_URL_MAP[
          MultichainNetworks.SolanaTestnet
        ],
    },
    isAddressCompatible: isSolanaAddress,
  },
};
