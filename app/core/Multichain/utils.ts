import { toChecksumHexAddress } from '@metamask/controller-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  EthAccountType,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  BtcAccountType,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { validate, Network } from 'bitcoin-address-validation';
import { isAddress as isSolanaAddress } from '@solana/addresses';
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
///: END:ONLY_INCLUDE_IF
