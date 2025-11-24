import { toChecksumHexAddress } from '@metamask/controller-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  EthAccountType,
  BtcAccountType,
  TrxAccountType,
  TrxScope,
} from '@metamask/keyring-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import Engine from '../Engine';
import { CaipChainId, Hex } from '@metamask/utils';
import { validate, Network } from 'bitcoin-address-validation';
import { MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP } from './constants';
import { formatAddress, isEthAddress } from '../../util/address';
import {
  formatBlockExplorerAddressUrl,
  formatBlockExplorerTransactionUrl,
} from './networks';
import { AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS } from '@metamask/multichain-network-controller';
import { base58 } from 'ethers/lib/utils';
import Logger from '../../util/Logger';

/**
 * Returns whether an account is an EVM account.
 *
 * @param account - The internal account to check.
 * @returns `true` if the account is of type Eoa or Erc4337, false otherwise.
 */
export function isEthAccount(account: InternalAccount): boolean {
  const { Eoa, Erc4337 } = EthAccountType;
  return Boolean(account && (account.type === Eoa || account.type === Erc4337));
}

/**
 * Returns the formatted address of an internal account. For EVM accounts, this
 * is the checksummed address. For Bitcoin accounts, this is the address without
 * any formatting.
 *
 * @param account - The internal account to format.
 * @returns The formatted address based on the account type.
 */
export function getFormattedAddressFromInternalAccount(
  account: InternalAccount,
): string {
  if (isEthAccount(account)) {
    return toChecksumHexAddress(account.address);
  }
  return account.address;
}

/**
 * Returns whether an address is a valid Solana address, specifically an account's.
 * Derived addresses (like Program's) will return false.
 * See: https://stackoverflow.com/questions/71200948/how-can-i-validate-a-solana-wallet-address-with-web3js
 *
 * @param address - The address to check.
 * @returns `true` if the address is a valid Solana address, `false` otherwise.
 */
export function isSolanaAccount(account: InternalAccount): boolean {
  return isSolanaAddress(account.address);
}

/**
 * Returns whether an address is a non-EVM address.
 *
 * @param address - The address to check.
 * @returns `true` if the address is a non-EVM address, `false` otherwise.
 */
export function isNonEvmAddress(address: string): boolean {
  // Instead of checking all other possible non-EVM addresses, we can just check if it's an EVM address
  // This is much faster than doing multiple checks if it's a Solana, Bitcoin, etc. address
  return !isEthAddress(address);
}

export function lastSelectedAccountAddressByNonEvmNetworkChainId(
  chainId: CaipChainId,
): string | undefined {
  const { AccountsController } = Engine.context;
  // TODO: Add teh logic if there is none last selected account what to do
  return AccountsController.getSelectedMultichainAccount(chainId)?.address;
}

export function lastSelectedAccountAddressInEvmNetwork(): string | undefined {
  const { AccountsController } = Engine.context;
  // TODO: Add teh logic if there is none last selected account what to do
  return AccountsController.getSelectedAccount()?.address;
}

/**
 * Returns whether a chain id is a non-EVM chain id.
 *
 * @param chainId - The chain id to check.
 * @returns `true` if the chain id is a non-EVM chain id, `false` otherwise.
 */
export function isNonEvmChainId(chainId: string | Hex | CaipChainId): boolean {
  return Object.keys(AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS).includes(
    chainId,
  );
}

/**
 * Returns whether an account is a Bitcoin account.
 *
 * @param account - The internal account to check.
 * @returns `true` if the account is of type P2wpkh, false otherwise.
 */
export function isBtcAccount(account: InternalAccount): boolean {
  const { P2wpkh } = BtcAccountType;
  return Boolean(account && account.type === P2wpkh);
}

/**
 * Returns whether an account is a Tron account.
 *
 * @param account - The internal account to check.
 * @returns `true` if the account is of type Eoa, false otherwise.
 */
export function isTronAccount(account: InternalAccount): boolean {
  const { Eoa } = TrxAccountType;
  return Boolean(account && account.type === Eoa);
}

/**
 * Returns whether a chain id is a Tron chain id.
 *
 * @param chainId - The chain id to check.
 * @returns `true` if the chain id is a Tron chain id, `false` otherwise.
 */
export function isTronChainId(chainId: string | Hex | CaipChainId): boolean {
  return Object.values(TrxScope).includes(chainId as TrxScope);
}

/**
 * Returns whether an address is on the Bitcoin mainnet.
 *
 * This function only checks the prefix of the address to determine if it's on
 * the mainnet or not. It doesn't validate the address itself, and should only
 * be used as a temporary solution until this information is included in the
 * account object.
 *
 * @param address - The address to check.
 * @returns `true` if the address is on the Bitcoin mainnet, `false` otherwise.
 */
export function isBtcMainnetAddress(address: string): boolean {
  return validate(address, Network.mainnet);
}

/**
 * Returns whether an address is on the Bitcoin testnet.
 *
 * See {@link isBtcMainnetAddress} for implementation details.
 *
 * @param address - The address to check.
 * @returns `true` if the address is on the Bitcoin testnet, `false` otherwise.
 */
export function isBtcTestnetAddress(address: string): boolean {
  return validate(address, Network.testnet);
}

/**
 * Returns whether an address is on the Bitcoin tegtest.
 *
 * See {@link isBtcMainnetAddress} for implementation details.
 *
 * @param address - The address to check.
 * @returns `true` if the address is on the Bitcoin regtest, `false` otherwise.
 */
export function isBtcRegtestAddress(address: string): boolean {
  return validate(address, Network.regtest);
}

/**
 * Returns whether an address is a valid Tron address.
 *
 * Tron addresses are 34 characters long, start with 'T' (mainnet), and are
 * base58 encoded. When decoded, they consist of 25 bytes: 1 byte version (0x41),
 * 20 bytes address, and 4 bytes checksum.
 *
 * @param address - The address to check.
 * @returns `true` if the address is a valid Tron address, `false` otherwise.
 */
export function isTronAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  if (address.length !== 34 || !address.startsWith('T')) {
    return false;
  }

  try {
    const decoded = base58.decode(address);
    return decoded.length === 25 && decoded[0] === 0x41;
  } catch (error) {
    Logger.error(new Error('Error decoding Tron address'), { error });
    return false;
  }
}

/**
 * Creates a transaction URL for block explorer based on network type
 * Different networks have different URL patterns:
 * Bitcoin Mainnet: https://blockstream.info/tx/{txId}
 * Bitcoin Testnet: https://blockstream.info/testnet/tx/{txId}
 * Solana Mainnet: https://solscan.io/tx/{txId}
 * Solana Devnet: https://solscan.io/tx/{txId}?cluster=devnet
 *
 * @param txId - Transaction ID
 * @param chainId - Network chain ID
 * @returns Full URL to transaction in block explorer, or empty string if no explorer URL
 */
export const getTransactionUrl = (
  txId: string,
  chainId: CaipChainId,
): string => {
  const explorerUrls =
    MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[chainId];
  if (!explorerUrls) {
    return '';
  }

  return formatBlockExplorerTransactionUrl(explorerUrls, txId);
};

/**
 * Creates an address URL for block explorer based on network type
 * Different networks have different URL patterns:
 * Bitcoin Mainnet: https://blockstream.info/address/{address}
 * Bitcoin Testnet: https://blockstream.info/testnet/address/{address}
 * Solana Mainnet: https://solscan.io/account/{address}
 * Solana Devnet: https://solscan.io/account/{address}?cluster=devnet
 *
 * @param address - Wallet address
 * @param chainId - Network chain ID
 * @returns Full URL to address in block explorer, or empty string if no explorer URL
 */
export const getAddressUrl = (
  address: string,
  chainId: CaipChainId,
): string => {
  const explorerUrls =
    MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[chainId];
  if (!explorerUrls) {
    return '';
  }

  return formatBlockExplorerAddressUrl(explorerUrls, address);
};

/**
 * Formats a shorten version of a transaction ID.
 *
 * @param txId - Transaction ID.
 * @returns Formatted transaction ID.
 */
export function shortenTransactionId(txId: string) {
  // For transactions we use a similar output for now, but shortenTransactionId will be added later.
  return formatAddress(txId, 'short');
}
