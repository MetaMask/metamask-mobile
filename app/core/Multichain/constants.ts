import { CaipChainId } from '@metamask/utils';
import {
  BtcAccountType,
  BtcScope,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import BTC from '../../images/bitcoin-logo.png';
import SOL from '../../images/solana-logo.png'
import { MultichainBlockExplorerFormatUrls } from './networks';


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

export enum MultichainNetworks {
  BITCOIN = 'bip122:000000000019d6689c085ae165831e93',
  BITCOIN_TESTNET = 'bip122:000000000933ea01ad0ee984209779ba',

  SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  SOLANA_DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  SOLANA_TESTNET = 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
}

export type MultichainNetworkIds = `${MultichainNetworks}`;

export type MultichainProviderConfig = ProviderConfigWithImageUrl & {
  nickname: string;
  chainId: CaipChainId;
  // Variant of block explorer URLs for non-EVM.
  blockExplorerFormatUrls?: MultichainBlockExplorerFormatUrls;
  // NOTE: For now we use a callback to check if the address is compatible with
  // the given network or not
  isAddressCompatible: (address: string) => boolean;
};

export const MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP: Record<
  CaipChainId,
  MultichainBlockExplorerFormatUrls
> = {
  [MultichainNetworks.BITCOIN]: {
    url: 'https://blockstream.info',
    address: 'https://blockstream.info/address/{address}',
    transaction: 'https://blockstream.info/tx/{txId}',
  },
  [MultichainNetworks.BITCOIN_TESTNET]: {
    url: 'https://blockstream.info',
    address: 'https://blockstream.info/testnet/address/{address}',
    transaction: 'https://blockstream.info/testnet/tx/{txId}',
  },

  [MultichainNetworks.SOLANA]: {
    url: 'https://explorer.solana.com',
    address: 'https://explorer.solana.com/address/{address}',
    transaction: 'https://explorer.solana.com/tx/{txId}',
  },
  [MultichainNetworks.SOLANA_DEVNET]: {
    url: 'https://explorer.solana.com',
    address: 'https://explorer.solana.com/address/{address}?cluster=devnet',
    transaction: 'https://explorer.solana.com/tx/{txId}?cluster=devnet',
  },
  [MultichainNetworks.SOLANA_TESTNET]: {
    url: 'https://explorer.solana.com',
    address: 'https://explorer.solana.com/address/{address}?cluster=testnet',
    transaction: 'https://explorer.solana.com/tx/{txId}?cluster=testnet',
  },
} as const;

export const MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET = {
  [BtcAccountType.P2wpkh]: MultichainNetworks.BITCOIN,
  [SolAccountType.DataAccount]: MultichainNetworks.SOLANA,
} as const;

export const PRICE_API_CURRENCIES = [
  'aud',
  'hkd',
  'sgd',
  'idr',
  'inr',
  'nzd',
  'php',
  'btc',
  'cad',
  'eur',
  'gbp',
  'jpy',
  'ltc',
  'rub',
  'uah',
  'usd',
  'xlm',
  'xrp',
  'sek',
  'aed',
  'ars',
  'bch',
  'bnb',
  'brl',
  'clp',
  'cny',
  'czk',
  'dkk',
  'chf',
  'dot',
  'eos',
  'eth',
  'gel',
  'huf',
  'ils',
  'krw',
  'mxn',
  'myr',
  'ngn',
  'nok',
  'pln',
  'thb',
  'try',
  'zar',
];
