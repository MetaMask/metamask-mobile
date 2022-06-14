import {
  toChecksumAddress,
  isValidAddress,
  isHexString,
  addHexPrefix,
  isValidChecksumAddress,
} from 'ethereumjs-util';
import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';
import { tlc } from '../general';
import punycode from 'punycode/punycode';
import { KeyringTypes } from '@metamask/controllers';

/**
 * Returns full checksummed address
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - String corresponding to full checksummed address
 */
export function renderFullAddress(address) {
  return address
    ? toChecksumAddress(address)
    : strings('transactions.tx_details_not_available');
}

/**
 * Method to format the address to a shorter version
 * @param {String} rawAddress - Full public  address
 * @param {String} type - Format  type
 * @returns {String} Formatted address
 */
export const formatAddress = (rawAddress, type) => {
  let formattedAddress = rawAddress;

  if (!isValidAddress(rawAddress)) {
    return rawAddress;
  }

  if (type && type === 'short') {
    formattedAddress = renderShortAddress(rawAddress);
  } else if (type && type === 'mid') {
    formattedAddress = renderSlightlyLongAddress(rawAddress);
  } else {
    formattedAddress = renderFullAddress(rawAddress);
  }

  return formattedAddress;
};

/**
 * Returns short address format
 *
 * @param {String} address - String corresponding to an address
 * @param {Number} chars - Number of characters to show at the end and beginning.
 * Defaults to 4.
 * @returns {String} - String corresponding to short address format
 */
export function renderShortAddress(address, chars = 4) {
  if (!address) return address;
  const checksummedAddress = toChecksumAddress(address);
  return `${checksummedAddress.substr(
    0,
    chars + 2,
  )}...${checksummedAddress.substr(-chars)}`;
}

export function renderSlightlyLongAddress(
  address,
  chars = 4,
  initialChars = 20,
) {
  if (!address) return address;
  const checksummedAddress = toChecksumAddress(address);
  return `${checksummedAddress.slice(
    0,
    chars + initialChars,
  )}...${checksummedAddress.slice(-chars)}`;
}

/**
 * Returns address name if it's in known identities
 *
 * @param {String} address - String corresponding to an address
 * @param {Object} identities - Identities object
 * @returns {String} - String corresponding to account name. If there is no name, returns the original short format address
 */
export function renderAccountName(address, identities) {
  address = safeToChecksumAddress(address);
  if (identities && address && address in identities) {
    return identities[address].name;
  }
  return renderShortAddress(address);
}

/**
 * Imports a an account from a private key
 *
 * @param {String} private_key - String corresponding to a private key
 * @returns {Promise} - Returns a promise
 */

export async function importAccountFromPrivateKey(private_key) {
  // Import private key
  let pkey = private_key;
  // Handle PKeys with 0x
  if (pkey.length === 66 && pkey.substr(0, 2) === '0x') {
    pkey = pkey.substr(2);
  }
  const { KeyringController } = Engine.context;
  return KeyringController.importAccountWithStrategy('privateKey', [pkey]);
}

/**
 * judge address is QR hardware account or not
 *
 * @param {String} address - String corresponding to an address
 * @returns {Boolean} - Returns a boolean
 */
export function isQRHardwareAccount(address) {
  const { KeyringController } = Engine.context;
  const { keyrings } = KeyringController.state;
  const qrKeyrings = keyrings.filter(
    (keyring) => keyring.type === KeyringTypes.qr,
  );
  let qrAccounts = [];
  for (const qrKeyring of qrKeyrings) {
    qrAccounts = qrAccounts.concat(
      qrKeyring.accounts.map((account) => account.toLowerCase()),
    );
  }
  return qrAccounts.includes(address.toLowerCase());
}

/**
 * judge address's account type for tracking
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - Returns address's account type
 */
export function getAddressAccountType(address) {
  const { KeyringController } = Engine.context;
  const { keyrings } = KeyringController.state;
  const targetKeyring = keyrings.find((keyring) =>
    keyring.accounts
      .map((account) => account.toLowerCase())
      .includes(address.toLowerCase()),
  );
  if (targetKeyring) {
    switch (targetKeyring.type) {
      case KeyringTypes.qr:
        return 'QR';
      case KeyringTypes.simple:
        return 'Imported';
      default:
        return 'MetaMask';
    }
  }
  throw new Error(`The address: ${address} is not imported`);
}

/**
 * Validates an ENS name
 *
 * @param {String} name - String corresponding to an ENS name
 * @returns {boolean} - Returns a boolean indicating if it is valid
 */
export function isENS(name) {
  if (!name) return false;

  const match = punycode
    .toASCII(name)
    .toLowerCase()
    // Checks that the domain consists of at least one valid domain pieces separated by periods, followed by a tld
    // Each piece of domain name has only the characters a-z, 0-9, and a hyphen (but not at the start or end of chunk)
    // A chunk has minimum length of 1, but minimum tld is set to 2 for now (no 1-character tlds exist yet)
    .match(
      /^(?:[a-z0-9](?:[-a-z0-9]*[a-z0-9])?\.)+[a-z0-9][-a-z0-9]*[a-z0-9]$/u,
    );

  const OFFSET = 1;
  const index = name && name.lastIndexOf('.');
  const tld =
    index &&
    index >= OFFSET &&
    tlc(name.substr(index + OFFSET, name.length - OFFSET));
  if (index && tld && !!match) return true;
  return false;
}

/**
 * Determines if a given string looks like a valid Ethereum address
 *
 * @param {address} string
 */
export function resemblesAddress(address) {
  return address.length === 2 + 20 * 2;
}

export function safeToChecksumAddress(address) {
  if (!address) return undefined;
  return toChecksumAddress(address);
}

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
 *  is prepended to the string
 * @param {boolean} [options.mixedCaseUseChecksum] - If true will treat mixed
 *  case addresses as checksum addresses and validate that proper checksum
 *  format is used
 * @returns {boolean} whether or not the input is a valid hex address
 */
export function isValidHexAddress(
  possibleAddress,
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
