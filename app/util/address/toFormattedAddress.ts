import { toChecksumHexAddress } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import {
  addHexPrefix,
  isValidChecksumAddress,
  isHexString,
  isValidAddress,
} from 'ethereumjs-util';

/**
 * Validates that the input is a hex address. This utility method is a thin
 * wrapper around ethereumjs-util.isValidAddress, with the exception that it
 * does not throw an error when provided values that are not hex strings. In
 * addition, and by default, this method will return true for hex strings that
 * meet the length requirement of a hex address, but are not prefixed with `0x`
 * Finally, if the mixedCaseUseChecksum flag is true and a mixed case string is
 * provided this method will validate it has the proper checksum formatting.
 *
 * @param {string} possibleAddress - Input parameter to check against
 * @param {Object} [options] - options bag
 * @param {boolean} [options.allowNonPrefixed] - If true will first ensure '0x'
 * is prepended to the string
 * @param {boolean} [options.mixedCaseUseChecksum] - If true will treat mixed
 * case addresses as checksum addresses and validate that proper checksum
 * format is used
 * @returns {boolean} whether or not the input is a valid hex address
 */
function isValidHexAddress(
  possibleAddress: string,
  { allowNonPrefixed = false, mixedCaseUseChecksum = false } = {},
) {
  const addressToCheck = allowNonPrefixed
    ? addHexPrefix(possibleAddress)
    : possibleAddress;
  if (!isHexString(addressToCheck)) {
    return false;
  }

  if (mixedCaseUseChecksum) {
    const prefixRemoved = addressToCheck.slice(2);
    const lower = prefixRemoved.toLowerCase();
    const upper = prefixRemoved.toUpperCase();
    const allOneCase = prefixRemoved === lower || prefixRemoved === upper;
    if (!allOneCase) {
      return isValidChecksumAddress(addressToCheck);
    }
  }
  return isValidAddress(addressToCheck);
}
/**
 * Checks if an address is an ethereum one.
 *
 * @param address - An address.
 * @returns True if the address is an ethereum one, false otherwise.
 */
function isEthAddress(address: string): boolean {
  return isValidHexAddress(address as Hex);
}
/**
 * Returns full formatted address. EVM addresses are checksummed, non EVM addresses are not.
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - String corresponding to full formatted address. EVM addresses are checksummed, non EVM addresses are not.
 */
export function toFormattedAddress(address: string) {
  return isEthAddress(address) ? toChecksumHexAddress(address) : address;
}
