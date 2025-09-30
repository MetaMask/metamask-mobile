import { CaipChainId } from '@metamask/utils';
import {
  BtcAccountType,
  BtcScope,
  SolAccountType,
  SolScope,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxAccountType,
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import imageIcons from '../../images/image-icons';
import { MultichainBlockExplorerFormatUrls } from './networks';

// Image imports for React Native rendering
export const MULTICHAIN_TOKEN_IMAGES = {
  [BtcScope.Mainnet]: imageIcons.BTC,
  [BtcScope.Testnet]: imageIcons['BTC-TESTNET'],
  [BtcScope.Testnet4]: imageIcons['BTC-TESTNET'],
  [BtcScope.Signet]: imageIcons['BTC-SIGNET'],
  [BtcScope.Regtest]: imageIcons['BTC-TESTNET'],
  [SolScope.Mainnet]: imageIcons.SOLANA,
  [SolScope.Devnet]: imageIcons.SOLANA,
  [SolScope.Testnet]: imageIcons.SOLANA,
  [TrxScope.Mainnet]: imageIcons.TRON,
  [TrxScope.Nile]: imageIcons.TRON,
  [TrxScope.Shasta]: imageIcons.TRON,
} as const;

export const MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP: Record<
  CaipChainId,
  MultichainBlockExplorerFormatUrls
> = {
  [BtcScope.Mainnet]: {
    url: 'https://mempool.space/',
    address: 'https://mempool.space/address/{address}',
    transaction: 'https://mempool.space/tx/{txId}',
  },
  [BtcScope.Testnet]: {
    url: 'https://mempool.space/',
    address: 'https://mempool.space/testnet/address/{address}',
    transaction: 'https://mempool.space/testnet/tx/{txId}',
  },
  [BtcScope.Testnet4]: {
    url: 'https://mempool.space/',
    address: 'https://mempool.space/testnet4/address/{address}',
    transaction: 'https://mempool.space/testnet4/tx/{txId}',
  },
  [BtcScope.Signet]: {
    url: 'https://mutinynet.com/',
    address: 'https://mutinynet.com/address/{address}',
    transaction: 'https://mutinynet.com/tx/{txId}',
  },
  [SolScope.Mainnet]: {
    url: 'https://solscan.io/',
    address: 'https://solscan.io/account/{address}',
    transaction: 'https://solscan.io/tx/{txId}',
  },
  [SolScope.Devnet]: {
    url: 'https://solscan.io/',
    address: 'https://solscan.io/account/{address}?cluster=devnet',
    transaction: 'https://solscan.io/tx/{txId}?cluster=devnet',
  },
  [SolScope.Testnet]: {
    url: 'https://solscan.io/',
    address: 'https://solscan.io/account/{address}?cluster=testnet',
    transaction: 'https://solscan.io/tx/{txId}?cluster=testnet',
  },
  [TrxScope.Mainnet]: {
    url: 'https://tronscan.org/',
    address: 'https://tronscan.org/#/address/{address}',
    transaction: 'https://tronscan.org/#/transaction/{txId}',
  },
  [TrxScope.Nile]: {
    url: 'https://nile.tronscan.org/',
    address: 'https://nile.tronscan.org/#/address/{address}',
    transaction: 'https://nile.tronscan.org/#/transaction/{txId}',
  },
  [TrxScope.Shasta]: {
    url: 'https://shasta.tronscan.org/',
    address: 'https://shasta.tronscan.org/#/address/{address}',
    transaction: 'https://shasta.tronscan.org/#/transaction/{txId}',
  },
} as const;

export const MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET = {
  [BtcAccountType.P2pkh]: BtcScope.Mainnet,
  [BtcAccountType.P2sh]: BtcScope.Mainnet,
  [BtcAccountType.P2wpkh]: BtcScope.Mainnet,
  [BtcAccountType.P2tr]: BtcScope.Mainnet,
  [SolAccountType.DataAccount]: SolScope.Mainnet,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  [TrxAccountType.Eoa]: TrxScope.Mainnet,
  ///: END:ONLY_INCLUDE_IF
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
