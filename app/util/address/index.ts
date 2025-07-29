import {
  isValidAddress,
  addHexPrefix,
  isValidChecksumAddress,
  isHexPrefixed,
} from 'ethereumjs-util';
import {
  getChecksumAddress,
  type Hex,
  isHexString,
  isStrictHexString,
} from '@metamask/utils';
import punycode from 'punycode/punycode';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';
import { tlc } from '../general';
import {
  doENSLookup,
  doENSReverseLookup,
  getCachedENSName,
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
import { selectChainId } from '../../selectors/networkController';
import { store } from '../../store';
import { regex } from '../../../app/util/regex';
import Logger from '../../../app/util/Logger';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AddressBookControllerState } from '@metamask/address-book-controller';
import {
  toChecksumHexAddress,
  type NetworkType,
} from '@metamask/controller-utils';
import type {
  NetworkClientId,
  NetworkState,
} from '@metamask/network-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import PREINSTALLED_SNAPS from '../../lib/snaps/preinstalled-snaps';
import { EntropySourceId } from '@metamask/keyring-api';

const {
  ASSET: { ERC721, ERC1155 },
} = TransactionTypes;
/**
 * Returns full formatted address. EVM addresses are checksummed, non EVM addresses are not.
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - String corresponding to full formatted address. EVM addresses are checksummed, non EVM addresses are not.
 */
export function renderFullAddress(address: string) {
  if (address) {
    return toFormattedAddress(address);
  }
  return strings('transactions.tx_details_not_available');
}

/**
 * Method to format the address to a shorter version
 * @param {String} rawAddress - Full public  address
 * @param {String} type - Format  type
 * @returns {String} Formatted address
 */
type FormatAddressType = 'short' | 'mid' | 'full';
export const formatAddress = (rawAddress: string, type: FormatAddressType) => {
  let formattedAddress = rawAddress;

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
 * Returns full formatted address. EVM addresses are checksummed, non EVM addresses are not.
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - String corresponding to full formatted address. EVM addresses are checksummed, non EVM addresses are not.
 */
export function toFormattedAddress(address: string) {
  return isEthAddress(address) ? toChecksumHexAddress(address) : address;
}

/**
 * Compares two addresses for equality, handling both EVM and non-EVM addresses appropriately.
 *
 * @param {string} address1 - The first address to compare
 * @param {string} address2 - The second address to compare
 * @returns {boolean} - Returns true if addresses are equal, false otherwise.
 * For EVM addresses, comparison is case-insensitive. For non-EVM addresses, comparison is case-sensitive.
 * Returns false if addresses are of different types (one EVM, one non-EVM) or if either address is falsy.
 */
export function areAddressesEqual(address1: string, address2: string) {
  if (!address1 || !address2) {
    return false;
  }

  const isAddress1Eth = isEthAddress(address1);
  const isAddress2Eth = isEthAddress(address2);

  // If one is an ETH address and the other is not, return false
  if (isAddress1Eth !== isAddress2Eth) {
    return false;
  }

  // If both are ETH addresses, do a lowercase comparison
  if (isAddress1Eth && isAddress2Eth) {
    return address1.toLowerCase() === address2.toLowerCase();
  }

  // If both are not ETH addresses, do a raw comparison.
  // This is important for non-EVM addresses since they are case sensitive.
  return address1 === address2;
}

/**
 * Returns short address format
 *
 * @param {String} address - String corresponding to an address
 * @param {Number} chars - Number of characters to show at the end and beginning.
 * Defaults to 5.
 * @returns {String} - String corresponding to short address format
 */
export function renderShortAddress(address: string, chars = 5) {
  if (!address) return address;
  const formattedAddress = toFormattedAddress(address);
  return `${formattedAddress.substr(0, chars + 2)}...${formattedAddress.substr(
    -chars,
  )}`;
}

export function renderSlightlyLongAddress(
  address: string,
  chars = 4,
  initialChars = 20,
) {
  const formattedAddress = toFormattedAddress(address);
  return `${formattedAddress.slice(
    0,
    chars + initialChars,
  )}...${formattedAddress.slice(-chars)}`;
}

/**
 * Returns address name if it's in known InternalAccounts
 *
 * @param {String} address - String corresponding to an address
 * @param {Array} internalAccounts -  Array of InternalAccounts objects
 * @returns {String} - String corresponding to account name. If there is no name, returns the original short format address
 */
export function renderAccountName(
  address: string,
  internalAccounts: InternalAccount[],
) {
  const chainId = selectChainId(store.getState());
  address = toFormattedAddress(address);
  const account = internalAccounts.find(
    (acc) => toFormattedAddress(acc.address) === address,
  );
  if (account) {
    const identityName = account.metadata.name;
    const ensName = getCachedENSName(address, chainId) || '';
    return isDefaultAccountName(identityName) && ensName
      ? ensName
      : identityName;
  }

  return renderShortAddress(address);
}

export function isHDOrFirstPartySnapAccount(account: InternalAccount) {
  if (
    account.metadata.keyring.type !== KeyringTypes.snap &&
    account.metadata.keyring.type !== KeyringTypes.hd
  ) {
    return false;
  }

  if (
    account.metadata.keyring.type === KeyringTypes.snap &&
    !PREINSTALLED_SNAPS.some(
      (snap) => snap.snapId === account.metadata.snap?.id,
    ) &&
    !account.options?.entropySource
  ) {
    return false;
  }

  return true;
}

/**
 * judge address is QR hardware account or not
 *
 * @param {String} address - String corresponding to an address
 * @returns {Boolean} - Returns a boolean
 */
export function isQRHardwareAccount(address: string) {
  if (!isValidHexAddress(address)) return false;

  const { KeyringController } = Engine.context;
  const { keyrings } = KeyringController.state;
  const qrKeyrings = keyrings.filter(
    (keyring) => keyring.type === ExtendedKeyringTypes.qr,
  );
  let qrAccounts: string[] = [];
  for (const qrKeyring of qrKeyrings) {
    qrAccounts = qrAccounts.concat(
      qrKeyring.accounts.map((account) => toFormattedAddress(account)),
    );
  }
  return qrAccounts.includes(toFormattedAddress(address));
}

/**
 * get address's kerying
 *
 * @param {String} address - String corresponding to an address
 * @returns {Keyring | undefined} - Returns the keyring of the provided address if keyring found, otherwise returns undefined
 */
export function getKeyringByAddress(address: string) {
  if (!isValidHexAddress(address)) {
    return undefined;
  }
  const { KeyringController } = Engine.context;
  const { keyrings } = KeyringController.state;
  return keyrings.find((keyring) =>
    keyring.accounts
      .map((account) => toFormattedAddress(account))
      .includes(toFormattedAddress(address)),
  );
}

/**
 * judge address is hardware account or not
 *
 * @param {String} address - String corresponding to an address
 * @param {Array<ExtendedKeyringTypes>} accountTypes - If it belongs to a specific hardware account type. By default all types are allowed.
 * @returns {Boolean} - Returns a boolean
 */
export function isHardwareAccount(
  address: string,
  accountTypes = [ExtendedKeyringTypes.qr, ExtendedKeyringTypes.ledger],
) {
  const keyring = getKeyringByAddress(address);
  return keyring && accountTypes.includes(keyring.type as ExtendedKeyringTypes);
}

/**
 * Determines if an address belongs to a snap account
 *
 * @param {String} address - String corresponding to an address
 * @returns {Boolean} - Returns a boolean
 */
export function isSnapAccount(address: string) {
  const keyring = getKeyringByAddress(address);
  return keyring && keyring.type === KeyringTypes.snap;
}

/**
 * judge address is a hardware account that require external operation or not
 *
 * @param {String} address - String corresponding to an address
 * @returns {Boolean} - Returns a boolean
 */
export function isExternalHardwareAccount(address: string) {
  return isHardwareAccount(address, [ExtendedKeyringTypes.ledger]);
}

/**
 * judge address is a private key account or not
 *
 * @param {InternalAccount} account - InternalAccount object
 * @returns {Boolean} - Returns a boolean
 */
export function isPrivateKeyAccount(account: InternalAccount) {
  return account.metadata.keyring.type === KeyringTypes.simple;
}

/**
 * Checks if an address is an ethereum one.
 *
 * @param address - An address.
 * @returns True if the address is an ethereum one, false otherwise.
 */
export function isEthAddress(address: string): boolean {
  return isValidHexAddress(address as Hex);
}

/**
 * gets the internal account by address
 *
 * @param {String} address - String corresponding to an address
 * @returns {InternalAccount | undefined} - Returns the internal account by address
 */
export function getInternalAccountByAddress(
  address: string,
): InternalAccount | undefined {
  const { accounts } = Engine.context.AccountsController.state.internalAccounts;
  return Object.values(accounts).find((a: InternalAccount) =>
    areAddressesEqual(a.address, address),
  );
}

/**
 * gets account label tag text based from an account
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - Returns address's translated label text
 */
export function getLabelTextByInternalAccount(
  internalAccount: InternalAccount,
) {
  const { KeyringController } = Engine.context;
  const { keyrings } = KeyringController.state;

  // Would be better if we have that mapping elsewhere, so we can index keyring by their
  // entropy source directly?
  const hdKeyringsIndexByEntropySource: Map<EntropySourceId, number> =
    new Map();
  for (const keyring of keyrings) {
    if (keyring.type === ExtendedKeyringTypes.hd) {
      // Use the size of the map, so we don't need an extra index variable for this.
      hdKeyringsIndexByEntropySource.set(
        keyring.metadata.id,
        hdKeyringsIndexByEntropySource.size,
      );
    }
  }

  const getSrpLabel = (hdInternalAccount: InternalAccount) => {
    // We do show pills only if we have multiple SRPs (and thus, multiple HD keyrings).
    const shouldShowSrpPill = hdKeyringsIndexByEntropySource.size > 1;

    if (shouldShowSrpPill && hdInternalAccount.options.entropySource) {
      const entropySource = hdInternalAccount.options
        .entropySource as EntropySourceId;

      const hdKeyringIndex = hdKeyringsIndexByEntropySource.get(entropySource);
      if (hdKeyringIndex !== undefined) {
        return strings('accounts.srp_index', { index: hdKeyringIndex + 1 }); // Add 1 to make it 1-indexed.
      }
    }
    return null;
  };

  switch (internalAccount?.metadata?.keyring?.type) {
    case ExtendedKeyringTypes.hd: {
      // Since @metamask/accounts-controller@28.0.0, HD accounts also have their entropy source
      // within the options bag, so re-use this:
      const srpLabel = getSrpLabel(internalAccount);
      if (srpLabel) {
        return srpLabel;
      }
      break;
    }
    case ExtendedKeyringTypes.ledger:
      return strings('accounts.ledger');
    case ExtendedKeyringTypes.qr:
      return strings('accounts.qr_hardware');
    case ExtendedKeyringTypes.simple:
      return strings('accounts.imported');
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    case KeyringTypes.snap: {
      // TODO: We should return multiple labels if one day we allow 3rd party Snaps (since they might have 2 pills:
      // 1. For the SRP (if they provide `options.entropySource`)
      // 2. For the "Snap tag" (`accounts.snap_account_tag`)
      const srpLabel = getSrpLabel(internalAccount);
      if (srpLabel) {
        return srpLabel;
      }

      const isPreinstalledSnap = PREINSTALLED_SNAPS.some(
        (snap) => snap.snapId === internalAccount?.metadata.snap?.id,
      );

      if (!isPreinstalledSnap) {
        return strings('accounts.snap_account_tag');
      }
    }
    ///: END:ONLY_INCLUDE_IF
  }
  return null;
}

/**
 * gets account label tag text based on address
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - Returns address's translated label text
 */
export function getLabelTextByAddress(address: string) {
  if (!address) return null;

  const internalAccount = getInternalAccountByAddress(address);
  if (!internalAccount) return null;

  return getLabelTextByInternalAccount(internalAccount);
}

/**
 * judge address's account type for tracking
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - Returns address's account type
 */
export function getAddressAccountType(address: string) {
  if (!isValidHexAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }

  const { KeyringController } = Engine.context;
  const { keyrings } = KeyringController.state;
  const targetKeyring = keyrings.find((keyring) =>
    keyring.accounts
      .map((account) => toFormattedAddress(account))
      .includes(toFormattedAddress(address)),
  );
  if (targetKeyring) {
    switch (targetKeyring.type) {
      case ExtendedKeyringTypes.qr:
        return 'QR';
      case ExtendedKeyringTypes.simple:
        return 'Imported';
      case ExtendedKeyringTypes.ledger:
        return 'Ledger';
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
export function isENS(name: string | undefined = undefined) {
  if (!name) return false;

  // Checks that the domain consists of at least one valid domain pieces separated by periods, followed by a tld
  // Each piece of domain name has only the characters a-z, 0-9, and a hyphen (but not at the start or end of chunk)
  // A chunk has minimum length of 1, but minimum tld is set to 2 for now (no 1-character tlds exist yet)
  const match = punycode.toASCII(name).toLowerCase().match(regex.ensName);

  const OFFSET = 1;
  const index = name?.lastIndexOf('.');
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
 * @param {string} address The 42 character Ethereum address composed of:
 * 2 ('0x': 2 char hex prefix) + 20 (last 20 bytes of public key) * 2 (as each byte is 2 chars in ascii)
 */
export function resemblesAddress(address: string) {
  return address && address.length === 2 + 20 * 2;
}

export function toChecksumAddress(address: string) {
  try {
    return getChecksumAddress(address as Hex);
  } catch (error) {
    // This is necessary for backward compatibility with the old behavior of
    // `ethereumjs-util` which would return the original string if the address
    // was invalid. This should happen only in tests which uses invalid addresses
    // like 0x1, 0x2 etc.
    if (error instanceof Error && error.message === 'Invalid hex address.') {
      if (isStrictHexString(address)) {
        return address as Hex;
      }
      throw new Error('Invalid hex address.');
    }
    throw error;
  }
}

export function safeToChecksumAddress(address?: string) {
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
 * is prepended to the string
 * @param {boolean} [options.mixedCaseUseChecksum] - If true will treat mixed
 * case addresses as checksum addresses and validate that proper checksum
 * format is used
 * @returns {boolean} whether or not the input is a valid hex address
 */
export function isValidHexAddress(
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
 *
 * @param {Object} params - Contains multiple variables that are needed to
 * check if the address is already saved in our contact list or in our accounts
 * Variables:
 * address (String) - Represents the address of the account
 * addressBook (Object) -  Represents all the contacts that we have saved on the address book
 * internalAccounts (Array) InternalAccount - Represents our accounts on the current network of the wallet
 * chainId (string) - The chain ID for the current selected network
 * @returns String | undefined - When it is saved returns a string "contactAlreadySaved" if it's not reutrn undefined
 */
function checkIfAddressAlreadySaved(
  address: string,
  addressBook: AddressBookControllerState['addressBook'],
  chainId: Hex,
  internalAccounts: InternalAccount[],
) {
  if (address && addressBook && internalAccounts) {
    const networkAddressBook = addressBook[chainId] || {};

    const formattedAddress = toFormattedAddress(address);
    if (
      networkAddressBook[formattedAddress] ||
      internalAccounts.find(
        (account) => toFormattedAddress(account.address) === formattedAddress,
      )
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
 * toAccount (String) - Represents the account address or ens
 * chainId (Hex String) - Represents the current chain ID
 * addressBook (Object) - Represents all the contacts that we have saved on the address book
 * internalAccounts (Array) InternalAccount - Represents our accounts on the current network of the wallet
 * providerType (String) - Represents the network name
 * @returns the variables that are needed for updating the state of the two flows metioned above
 * Variables:
 * addressError (String) - Contains the message or the error
 * toEnsName (String) - Represents the ens name of the destination account
 * addressReady (Bollean) - Represents if the address is validated or not
 * toEnsAddress (String) - Represents the address of the ens inserted
 * addToAddressToAddressBook (Boolean) - Represents if the address it can be add to the address book
 * toAddressName (String) - Represents the address of the destination account
 * errorContinue (Boolean) - Represents if with one error we can proceed or not to the next step if we wish
 * confusableCollection (Object) - Represents one array with the confusable characters of the ens
 *
 */
export async function validateAddressOrENS(
  toAccount: string,
  addressBook: AddressBookControllerState['addressBook'],
  internalAccounts: InternalAccount[],
  chainId: Hex,
) {
  const { AssetsContractController } = Engine.context;

  let addressError,
    toEnsName,
    toEnsAddress,
    toAddressName,
    errorContinue,
    confusableCollection;

  let [addressReady, addToAddressToAddressBook] = [false, false];

  if (isValidHexAddress(toAccount, { mixedCaseUseChecksum: true })) {
    const contactAlreadySaved = checkIfAddressAlreadySaved(
      toAccount,
      addressBook,
      chainId,
      internalAccounts,
    );

    if (contactAlreadySaved) {
      addressError = checkIfAddressAlreadySaved(
        toAccount,
        addressBook,
        chainId,
        internalAccounts,
      );
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
    const resolvedAddress = await doENSLookup(toAccount, chainId);
    const contactAlreadySaved = checkIfAddressAlreadySaved(
      resolvedAddress,
      addressBook,
      chainId,
      internalAccounts,
    );

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
export function isValidAddressInputViaQRCode(input: string) {
  if (input.includes(PROTOCOLS.ETHEREUM)) {
    const { pathname } = new URL(input);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
export const stripHexPrefix = (str: string) => {
  if (typeof str !== 'string') {
    return str;
  }
  return isHexPrefixed(str) ? str.slice(2) : str;
};

/**
 * Method to check if address is ENS and return the address
 *
 * @param {String} toAccount - Address or ENS
 * @param {String} chainId - The chain ID for the given address
 * @returns {String} - Address or null
 */
export async function getAddress(
  toAccount: string,
  chainId: string,
): Promise<string | null> {
  if (isENS(toAccount)) {
    return await doENSLookup(toAccount, chainId);
  }
  if (isValidHexAddress(toAccount, { mixedCaseUseChecksum: true })) {
    return toAccount;
  }
  return null;
}

export const getTokenDetails = async (
  tokenAddress: string,
  userAddress?: string,
  tokenId?: string,
  networkClientId?: NetworkClientId,
) => {
  const { AssetsContractController } = Engine.context;
  const tokenData = await AssetsContractController.getTokenStandardAndDetails(
    tokenAddress,
    userAddress,
    tokenId,
    networkClientId,
  );
  const { standard, name, symbol, decimals, balance } = tokenData;
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
    balance,
  };
};

export const getTokenDecimal = async (
  address: string,
  networkClientId?: NetworkClientId,
) => {
  const { AssetsContractController } = Engine.context;
  try {
    const tokenDecimal = await AssetsContractController.getERC20TokenDecimals(
      address,
      networkClientId,
    );
    return tokenDecimal;
  } catch (err) {
    await Logger.log('Error getting token decimal: ', err);
  }
};

export const shouldShowBlockExplorer = (
  providerType: NetworkType,
  providerRpcTarget: string,
  networkConfigurations: NetworkState['networkConfigurationsByChainId'],
) => {
  if (providerType === RPC) {
    return findBlockExplorerForRpc(providerRpcTarget, networkConfigurations);
  }
  return true;
};
