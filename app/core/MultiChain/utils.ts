import {
  InternalAccount,
  BtcAccountType,
  EthAccountType,
} from '@metamask/keyring-api';
import { isEthAddress } from '../../util/address';

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
  return (
    !isEthAddress(address) &&
    (address.startsWith('bc1') || address.startsWith('1'))
  );
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
  return !isEthAddress(address) && !isBtcMainnetAddress(address);
}
