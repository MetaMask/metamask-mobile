import {
  toChecksumAddress,
  isValidAddress,
  isHexString,
  addHexPrefix,
  isValidChecksumAddress,
  isHexPrefixed,
} from 'ethereumjs-util';
import URL from 'url-parse';
import punycode from 'punycode/punycode';
import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';
import { tlc } from '../general';
import {
  doENSLookup,
  doENSReverseLookup,
  ENSCache,
  isDefaultAccountName,
} from '../../util/ENSUtils';
import {
  isMainnetByChainId,
  findBlockExplorerForRpc,
} from '../../util/networks';
import { RPC } from '../../constants/network';
import { collectConfusables } from '../../util/confusables';
import {
  CONTACT_ALREADY_SAVED,
  SYMBOL_ERROR,
} from '../../../app/constants/error';
import { PROTOCOLS } from '../../constants/deeplinks';
import TransactionTypes from '../../core/TransactionTypes';

const {
  ASSET: { ERC721, ERC1155 },
} = TransactionTypes;
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
  const { NetworkController } = Engine.context;
  const network = NetworkController.state.network;
  address = safeToChecksumAddress(address);
  if (identities && address && address in identities) {
    const identityName = identities[address].name;
    const ensName = ENSCache.cache[`${network}${address}`]?.name || '';
    return isDefaultAccountName(identityName) && ensName
      ? ensName
      : identityName;
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
  const { KeyringController, PreferencesController } = Engine.context;
  // Import private key
  let pkey = private_key;
  // Handle PKeys with 0x
  if (pkey.length === 66 && pkey.substr(0, 2) === '0x') {
    pkey = pkey.substr(2);
  }
  const { importedAccountAddress } =
    await KeyringController.importAccountWithStrategy('privateKey', [pkey]);
  const checksummedAddress = safeToChecksumAddress(importedAccountAddress);
  return PreferencesController.setSelectedAddress(checksummedAddress);
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

/**
 *
 * @param {Object} params - Contains multiple variables that are needed to
 * check if the address is already saved in our contact list or in our accounts
 * Variables:
 *  address (String) - Represents the address of the account
 *  addressBook (Object) -  Represents all the contacts that we have saved on the address book
 *  identities (Object) - Represents our accounts on the current network of the wallet
 * @returns String | undefined - When it is saved returns a string "contactAlreadySaved" if it's not reutrn undefined
 */
function checkIfAddressAlreadySaved(params) {
  const { address, addressBook, network, identities } = params;
  if (address) {
    const networkAddressBook = addressBook[network] || {};

    const checksummedResolvedAddress = toChecksumAddress(address);
    if (
      networkAddressBook[checksummedResolvedAddress] ||
      identities[checksummedResolvedAddress]
    ) {
      return CONTACT_ALREADY_SAVED;
    }
  }
  return false;
}

/**
 *
 * @param {Object} params - Contains multiple variables that are needed to validate an address or ens
 * This function is needed in two place of the app, SendTo of SendFlow in order to send tokes and
 * is present in ContactForm of Contatcs, in order to add a new contact
 * Variables:
 *  toAccount (String) - Represents the account address or ens
 *  network (String) - Represents the current network chainId
 *  addressBook (Object) - Represents all the contacts that we have saved on the address book
 *  identities (Object) - Represents our accounts on the current network of the wallet
 *  providerType (String) - Represents the network name
 * @returns the variables that are needed for updating the state of the two flows metioned above
 * Variables:
 *  addressError (String) - Contains the message or the error
 *  toEnsName (String) - Represents the ens name of the destination account
 *  addressReady (Bollean) - Represents if the address is validated or not
 *  toEnsAddress (String) - Represents the address of the ens inserted
 *  addToAddressToAddressBook (Boolean) - Represents if the address it can be add to the address book
 *  toAddressName (String) - Represents the address of the destination account
 *  errorContinue (Boolean) - Represents if with one error we can proceed or not to the next step if we wish
 *  confusableCollection (Object) - Represents one array with the confusable characters of the ens
 *
 */
export async function validateAddressOrENS(params) {
  const { toAccount, network, addressBook, identities, chainId } = params;
  const { AssetsContractController } = Engine.context;

  let addressError,
    toEnsName,
    toEnsAddress,
    toAddressName,
    errorContinue,
    confusableCollection;

  let [addressReady, addToAddressToAddressBook] = [false, false];

  if (isValidHexAddress(toAccount, { mixedCaseUseChecksum: true })) {
    const contactAlreadySaved = checkIfAddressAlreadySaved({
      address: toAccount,
      addressBook,
      network,
      identities,
    });

    if (contactAlreadySaved) {
      addressError = checkIfAddressAlreadySaved(toAccount);
    }
    const checksummedAddress = toChecksumAddress(toAccount);
    addressReady = true;
    const ens = await doENSReverseLookup(checksummedAddress);
    if (ens) {
      toAddressName = ens;
      if (!contactAlreadySaved) {
        addToAddressToAddressBook = true;
      }
    } else if (!contactAlreadySaved) {
      toAddressName = toAccount;
      // If not in the addressBook nor user accounts
      addToAddressToAddressBook = true;
    }

    if (chainId !== undefined) {
      const isMainnet = isMainnetByChainId(chainId);
      // Check if it's token contract address on mainnet
      if (isMainnet) {
        try {
          const symbol = await AssetsContractController.getERC721AssetSymbol(
            checksummedAddress,
          );
          if (symbol) {
            addressError = SYMBOL_ERROR;
            errorContinue = true;
          }
        } catch (e) {
          // Not a token address
        }
      }
    }
    /**
     * Not using this for now; Import isSmartContractAddress from util/transactions and use this for checking smart contract: await isSmartContractAddress(toSelectedAddress);
     * Check if it's smart contract address
     */
    /*
               const smart = false; //

               if (smart) {
                    addressError = strings('transaction.smartContractAddressWarning');
                    isOnlyWarning = true;
               }
               */
  } else if (isENS(toAccount)) {
    toEnsName = toAccount;
    confusableCollection = collectConfusables(toEnsName);
    const resolvedAddress = await doENSLookup(toAccount, network);
    const contactAlreadySaved = checkIfAddressAlreadySaved({
      address: resolvedAddress,
      addressBook,
      network,
      identities,
    });

    if (resolvedAddress) {
      if (!contactAlreadySaved) {
        addToAddressToAddressBook = true;
      } else {
        addressError = contactAlreadySaved;
      }

      toAddressName = toAccount;
      toEnsAddress = resolvedAddress;
      addressReady = true;
    } else {
      addressError = strings('transaction.could_not_resolve_ens');
    }
  } else if (toAccount && toAccount.length >= 42) {
    addressError = strings('transaction.invalid_address');
  }

  return {
    addressError,
    toEnsName,
    addressReady,
    toEnsAddress,
    addToAddressToAddressBook,
    toAddressName,
    errorContinue,
    confusableCollection,
  };
}
/** Method to evaluate if an input is a valid ethereum address
 * via QR code scanning.
 *
 * @param {string} input - a random string.
 * @returns {boolean} indicates if the string is a valid input.
 */
export function isValidAddressInputViaQRCode(input) {
  if (input.includes(PROTOCOLS.ETHEREUM)) {
    const { pathname } = new URL(input);
    // eslint-disable-next-line no-unused-vars
    const [address, _] = pathname.split('@');
    return isValidHexAddress(address);
  }
  return isValidHexAddress(input);
}

/** Removes hex prefix from a string if it's there.
 *
 * @param {string} str
 * @returns {string}
 */
export const stripHexPrefix = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  return isHexPrefixed(str) ? str.slice(2) : str;
};

/**
 * Method to check if address is ENS and return the address
 * @param {String} toAccount - Address or ENS
 * @param {String} network - Network id
 * @returns {String} - Address or null
 */
export async function getAddress(toAccount, network) {
  if (isENS(toAccount)) {
    return await doENSLookup(toAccount, network);
  }
  if (isValidHexAddress(toAccount, { mixedCaseUseChecksum: true })) {
    return toAccount;
  }
  return null;
}

export const getTokenDetails = async (tokenAddress, userAddress, tokenId) => {
  const { AssetsContractController } = Engine.context;
  const tokenData = await AssetsContractController.getTokenStandardAndDetails(
    tokenAddress,
    userAddress,
    tokenId,
  );
  const { standard, name, symbol, decimals } = tokenData;
  if (standard === ERC721 || standard === ERC1155) {
    return {
      name,
      symbol,
      standard,
    };
  }
  return {
    symbol,
    decimals,
    standard,
  };
};

export const shouldShowBlockExplorer = ({
  providerType,
  providerRpcTarget,
  frequentRpcList,
}) => {
  if (providerType === RPC) {
    return findBlockExplorerForRpc(providerRpcTarget, frequentRpcList);
  }
  return true;
};
