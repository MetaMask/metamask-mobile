import { toChecksumHexAddress } from '@metamask/controller-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  EthAccountType,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  BtcAccountType,
  SolScopes,
  BtcScopes,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { validate, Network } from 'bitcoin-address-validation';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import Engine from '../Engine';
import { CaipChainId, Hex } from '@metamask/utils';
///: END:ONLY_INCLUDE_IF

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

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)

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
  return isSolanaAddress(address) || isBtcMainnetAddress(address);
}

/**
 * Returns the chain id of the non-EVM network based on the account address.
 *
 * @param address - The address to check.
 * @returns The chain id of the non-EVM network.
 */
export function nonEvmNetworkChainIdByAccountAddress(address: string): string {
  if (isSolanaAddress(address)) {
    return SolScopes.Mainnet;
  }
  return BtcScopes.Mainnet;
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
export function isNonEvmChainId(chainId: string | Hex): boolean {
  return chainId === SolScopes.Mainnet || chainId === BtcScopes.Mainnet;
}
///: END:ONLY_INCLUDE_IF
