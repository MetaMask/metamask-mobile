import { isValidHexAddress } from '../address';

// Types for parsed CAIP-10 address components
export interface Caip10Address {
  accountId: string;
  chainId: string;
  address: string;
}

/**
 * Parses a CAIP-10 formatted address into its components.
 *
 * CAIP-10 addresses follow the format `namespace:reference:address`,
 * where `namespace` and `reference` identify the blockchain, and `address`
 * specifies the account on that blockchain. This function extracts and returns
 * these components as an object. It throws an error for invalid formats.
 *
 * @param {string} caip10Address - The CAIP-10 formatted address to parse.
 * @returns {Caip10Address} An object containing the parsed `accountId`, `chainId`,                          and `address`.
 * @throws {Error} If `caip10Address` does not conform to the CAIP-10 format.
 *
 * @example
 * parseCaip10Address('eip155:1:0x1234567890abcdefABCDEF1234567890ABCDEF');
 * // Returns: { accountId: 'eip155', chainId: '1', address: '0x1234567890abcdefABCDEF1234567890ABCDEF' }
 */
export function parseCaip10Address(caip10Address: string): Caip10Address {
  if (/\s/.test(caip10Address)) {
    throw new Error('CAIP-10 address format cannot contain spaces');
  }

  const parts = caip10Address.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid CAIP-10 address format');
  }
  const [accountId, chainId, address] = parts;

  // For now we only support EVM addresses, so we only validate those
  if (accountId === 'eip155') {
    if (!isValidHexAddress(address)) {
      throw new Error('Invalid Ethereum address format');
    }
  } else {
    throw new Error('Only support Ethereum addresses at the moment');
  }

  return { accountId, chainId, address };
}
