"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.shouldShowBlockExplorer = exports.getTokenDecimal = exports.getTokenDetails = exports.getAddress = exports.stripHexPrefix = exports.isValidAddressInputViaQRCode = exports.validateAddressOrENS = exports.isValidHexAddress = exports.safeToChecksumAddress = exports.resemblesAddress = exports.isENS = exports.getAddressAccountType = exports.getLabelTextByAddress = exports.isExternalHardwareAccount = exports.isHardwareAccount = exports.getKeyringByAddress = exports.isQRHardwareAccount = exports.importAccountFromPrivateKey = exports.renderAccountName = exports.renderSlightlyLongAddress = exports.renderShortAddress = exports.formatAddress = exports.renderFullAddress = void 0;
var ethereumjs_util_1 = require("ethereumjs-util");
var punycode_1 = require("punycode/punycode");
var keyringTypes_1 = require("../../constants/keyringTypes");
var Engine_1 = require("../../core/Engine");
var i18n_1 = require("../../../locales/i18n");
var general_1 = require("../general");
var ENSUtils_1 = require("../../util/ENSUtils");
var networks_1 = require("../../util/networks");
var network_1 = require("../../constants/network");
var confusables_1 = require("../../util/confusables");
var error_1 = require("../../../app/constants/error");
var deeplinks_1 = require("../../constants/deeplinks");
var TransactionTypes_1 = require("../../core/TransactionTypes");
var networkController_1 = require("../../selectors/networkController");
var store_1 = require("../../store");
var regex_1 = require("../../../app/util/regex");
var Logger_1 = require("../../../app/util/Logger");
var controller_utils_1 = require("@metamask/controller-utils");
var keyring_controller_1 = require("@metamask/keyring-controller");
var utils_1 = require("@metamask/utils");
var _c = TransactionTypes_1["default"].ASSET, ERC721 = _c.ERC721, ERC1155 = _c.ERC1155;
/**
 * Returns full checksummed address
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - String corresponding to full checksummed address
 */
function renderFullAddress(address) {
    return address
        ? (0, ethereumjs_util_1.toChecksumAddress)(address)
        : (0, i18n_1.strings)('transactions.tx_details_not_available');
}
exports.renderFullAddress = renderFullAddress;
var formatAddress = function (rawAddress, type) {
    var formattedAddress = rawAddress;
    if (!(0, ethereumjs_util_1.isValidAddress)(rawAddress)) {
        return rawAddress;
    }
    if (type && type === 'short') {
        formattedAddress = renderShortAddress(rawAddress);
    }
    else if (type && type === 'mid') {
        formattedAddress = renderSlightlyLongAddress(rawAddress);
    }
    else {
        formattedAddress = renderFullAddress(rawAddress);
    }
    return formattedAddress;
};
exports.formatAddress = formatAddress;
/**
 * Returns short address format
 *
 * @param {String} address - String corresponding to an address
 * @param {Number} chars - Number of characters to show at the end and beginning.
 * Defaults to 4.
 * @returns {String} - String corresponding to short address format
 */
function renderShortAddress(address, chars) {
    if (chars === void 0) { chars = 4; }
    if (!address)
        return address;
    var checksummedAddress = (0, ethereumjs_util_1.toChecksumAddress)(address);
    return "".concat(checksummedAddress.substr(0, chars + 2), "...").concat(checksummedAddress.substr(-chars));
}
exports.renderShortAddress = renderShortAddress;
function renderSlightlyLongAddress(address, chars, initialChars) {
    if (chars === void 0) { chars = 4; }
    if (initialChars === void 0) { initialChars = 20; }
    var checksummedAddress = (0, ethereumjs_util_1.toChecksumAddress)(address);
    return "".concat(checksummedAddress.slice(0, chars + initialChars), "...").concat(checksummedAddress.slice(-chars));
}
exports.renderSlightlyLongAddress = renderSlightlyLongAddress;
/**
 * Returns address name if it's in known InternalAccounts
 *
 * @param {String} address - String corresponding to an address
 * @param {Array} internalAccounts -  Array of InternalAccounts objects
 * @returns {String} - String corresponding to account name. If there is no name, returns the original short format address
 */
function renderAccountName(address, internalAccounts) {
    var chainId = (0, networkController_1.selectChainId)(store_1.store.getState());
    address = (0, controller_utils_1.toChecksumHexAddress)(address);
    var account = internalAccounts.find(function (acc) {
        return (0, general_1.toLowerCaseEquals)(acc.address, address);
    });
    if (account) {
        var identityName = account.metadata.name;
        var ensName = (0, ENSUtils_1.getCachedENSName)(address, chainId) || '';
        return (0, ENSUtils_1.isDefaultAccountName)(identityName) && ensName
            ? ensName
            : identityName;
    }
    return renderShortAddress(address);
}
exports.renderAccountName = renderAccountName;
/**
 * Imports an account from a private key
 *
 * @param {String} private_key - String corresponding to a private key
 * @returns {Promise} - Returns a promise
 */
function importAccountFromPrivateKey(private_key) {
    return __awaiter(this, void 0, void 0, function () {
        var KeyringController, pkey, importedAccountAddress, checksummedAddress;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    KeyringController = Engine_1["default"].context.KeyringController;
                    pkey = private_key;
                    // Handle PKeys with 0x
                    if (pkey.length === 66 && pkey.substr(0, 2) === '0x') {
                        pkey = pkey.substr(2);
                    }
                    return [4 /*yield*/, KeyringController.importAccountWithStrategy(keyring_controller_1.AccountImportStrategy.privateKey, [pkey])];
                case 1:
                    importedAccountAddress = _c.sent();
                    checksummedAddress = (0, controller_utils_1.toChecksumHexAddress)(importedAccountAddress);
                    return [2 /*return*/, Engine_1["default"].setSelectedAddress(checksummedAddress)];
            }
        });
    });
}
exports.importAccountFromPrivateKey = importAccountFromPrivateKey;
/**
 * judge address is QR hardware account or not
 *
 * @param {String} address - String corresponding to an address
 * @returns {Boolean} - Returns a boolean
 */
function isQRHardwareAccount(address) {
    if (!isValidHexAddress(address))
        return false;
    var KeyringController = Engine_1["default"].context.KeyringController;
    var keyrings = KeyringController.state.keyrings;
    var qrKeyrings = keyrings.filter(function (keyring) { return keyring.type === keyringTypes_1["default"].qr; });
    var qrAccounts = [];
    for (var _i = 0, qrKeyrings_1 = qrKeyrings; _i < qrKeyrings_1.length; _i++) {
        var qrKeyring = qrKeyrings_1[_i];
        qrAccounts = qrAccounts.concat(qrKeyring.accounts.map(function (account) { return account.toLowerCase(); }));
    }
    return qrAccounts.includes(address.toLowerCase());
}
exports.isQRHardwareAccount = isQRHardwareAccount;
/**
 * get address's kerying
 *
 * @param {String} address - String corresponding to an address
 * @returns {Keyring | undefined} - Returns the keyring of the provided address if keyring found, otherwise returns undefined
 */
function getKeyringByAddress(address) {
    if (!isValidHexAddress(address)) {
        return undefined;
    }
    var KeyringController = Engine_1["default"].context.KeyringController;
    var keyrings = KeyringController.state.keyrings;
    return keyrings.find(function (keyring) {
        return keyring.accounts
            .map(function (account) { return account.toLowerCase(); })
            .includes(address.toLowerCase());
    });
}
exports.getKeyringByAddress = getKeyringByAddress;
/**
 * judge address is hardware account or not
 *
 * @param {String} address - String corresponding to an address
 * @param {Array<ExtendedKeyringTypes>} accountTypes - If it belongs to a specific hardware account type. By default all types are allowed.
 * @returns {Boolean} - Returns a boolean
 */
function isHardwareAccount(address, accountTypes) {
    if (accountTypes === void 0) { accountTypes = [keyringTypes_1["default"].qr, keyringTypes_1["default"].ledger]; }
    var keyring = getKeyringByAddress(address);
    return keyring && accountTypes.includes(keyring.type);
}
exports.isHardwareAccount = isHardwareAccount;
/**
 * judge address is a hardware account that require external operation or not
 *
 * @param {String} address - String corresponding to an address
 * @returns {Boolean} - Returns a boolean
 */
function isExternalHardwareAccount(address) {
    return isHardwareAccount(address, [keyringTypes_1["default"].ledger]);
}
exports.isExternalHardwareAccount = isExternalHardwareAccount;
/**
 * gets i18n account label tag text based on address
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - Returns address's i18n label text
 */
function getLabelTextByAddress(address) {
    if (!address)
        return null;
    var keyring = getKeyringByAddress(address);
    if (keyring) {
        switch (keyring.type) {
            case keyringTypes_1["default"].ledger:
                return 'accounts.ledger';
            case keyringTypes_1["default"].qr:
                return 'accounts.qr_hardware';
            case keyringTypes_1["default"].simple:
                return 'accounts.imported';
        }
    }
    return null;
}
exports.getLabelTextByAddress = getLabelTextByAddress;
/**
 * judge address's account type for tracking
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - Returns address's account type
 */
function getAddressAccountType(address) {
    if (!isValidHexAddress(address)) {
        throw new Error("Invalid address: ".concat(address));
    }
    var KeyringController = Engine_1["default"].context.KeyringController;
    var keyrings = KeyringController.state.keyrings;
    var targetKeyring = keyrings.find(function (keyring) {
        return keyring.accounts
            .map(function (account) { return account.toLowerCase(); })
            .includes(address.toLowerCase());
    });
    if (targetKeyring) {
        switch (targetKeyring.type) {
            case keyringTypes_1["default"].qr:
                return 'QR';
            case keyringTypes_1["default"].simple:
                return 'Imported';
            case keyringTypes_1["default"].ledger:
                return 'Ledger';
            default:
                return 'MetaMask';
        }
    }
    throw new Error("The address: ".concat(address, " is not imported"));
}
exports.getAddressAccountType = getAddressAccountType;
/**
 * Validates an ENS name
 *
 * @param {String} name - String corresponding to an ENS name
 * @returns {boolean} - Returns a boolean indicating if it is valid
 */
function isENS(name) {
    if (name === void 0) { name = undefined; }
    if (!name)
        return false;
    // Checks that the domain consists of at least one valid domain pieces separated by periods, followed by a tld
    // Each piece of domain name has only the characters a-z, 0-9, and a hyphen (but not at the start or end of chunk)
    // A chunk has minimum length of 1, but minimum tld is set to 2 for now (no 1-character tlds exist yet)
    var match = punycode_1["default"].toASCII(name).toLowerCase().match(regex_1.regex.ensName);
    var OFFSET = 1;
    var index = name === null || name === void 0 ? void 0 : name.lastIndexOf('.');
    var tld = index &&
        index >= OFFSET &&
        (0, general_1.tlc)(name.substr(index + OFFSET, name.length - OFFSET));
    if (index && tld && !!match)
        return true;
    return false;
}
exports.isENS = isENS;
/**
 * Determines if a given string looks like a valid Ethereum address
 *
 * @param {string} address The 42 character Ethereum address composed of:
 * 2 ('0x': 2 char hex prefix) + 20 (last 20 bytes of public key) * 2 (as each byte is 2 chars in ascii)
 */
function resemblesAddress(address) {
    return address && address.length === 2 + 20 * 2;
}
exports.resemblesAddress = resemblesAddress;
function safeToChecksumAddress(address) {
    if (!address)
        return undefined;
    return (0, ethereumjs_util_1.toChecksumAddress)(address);
}
exports.safeToChecksumAddress = safeToChecksumAddress;
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
function isValidHexAddress(possibleAddress, _c) {
    var _d = _c === void 0 ? {} : _c, _e = _d.allowNonPrefixed, allowNonPrefixed = _e === void 0 ? false : _e, _f = _d.mixedCaseUseChecksum, mixedCaseUseChecksum = _f === void 0 ? false : _f;
    var addressToCheck = allowNonPrefixed
        ? (0, ethereumjs_util_1.addHexPrefix)(possibleAddress)
        : possibleAddress;
    if (!(0, utils_1.isHexString)(addressToCheck)) {
        return false;
    }
    if (mixedCaseUseChecksum) {
        var prefixRemoved = addressToCheck.slice(2);
        var lower = prefixRemoved.toLowerCase();
        var upper = prefixRemoved.toUpperCase();
        var allOneCase = prefixRemoved === lower || prefixRemoved === upper;
        if (!allOneCase) {
            return (0, ethereumjs_util_1.isValidChecksumAddress)(addressToCheck);
        }
    }
    return (0, ethereumjs_util_1.isValidAddress)(addressToCheck);
}
exports.isValidHexAddress = isValidHexAddress;
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
function checkIfAddressAlreadySaved(address, addressBook, chainId, internalAccounts) {
    if (address) {
        var networkAddressBook = addressBook[chainId] || {};
        var checksummedResolvedAddress_1 = (0, ethereumjs_util_1.toChecksumAddress)(address);
        if (networkAddressBook[checksummedResolvedAddress_1] ||
            internalAccounts.find(function (account) {
                return (0, general_1.toLowerCaseEquals)(account.address, checksummedResolvedAddress_1);
            })) {
            return error_1.CONTACT_ALREADY_SAVED;
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
function validateAddressOrENS(toAccount, addressBook, internalAccounts, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var AssetsContractController, addressError, toEnsName, toEnsAddress, toAddressName, errorContinue, confusableCollection, _c, addressReady, addToAddressToAddressBook, contactAlreadySaved, checksummedAddress, ens, isMainnet, symbol, e_1, resolvedAddress, contactAlreadySaved;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    AssetsContractController = Engine_1["default"].context.AssetsContractController;
                    _c = [false, false], addressReady = _c[0], addToAddressToAddressBook = _c[1];
                    if (!isValidHexAddress(toAccount, { mixedCaseUseChecksum: true })) return [3 /*break*/, 6];
                    contactAlreadySaved = checkIfAddressAlreadySaved(toAccount, addressBook, chainId, internalAccounts);
                    if (contactAlreadySaved) {
                        addressError = checkIfAddressAlreadySaved(toAccount, addressBook, chainId, internalAccounts);
                    }
                    checksummedAddress = (0, ethereumjs_util_1.toChecksumAddress)(toAccount);
                    addressReady = true;
                    return [4 /*yield*/, (0, ENSUtils_1.doENSReverseLookup)(checksummedAddress)];
                case 1:
                    ens = _d.sent();
                    if (ens) {
                        toAddressName = ens;
                        if (!contactAlreadySaved) {
                            addToAddressToAddressBook = true;
                        }
                    }
                    else if (!contactAlreadySaved) {
                        toAddressName = toAccount;
                        // If not in the addressBook nor user accounts
                        addToAddressToAddressBook = true;
                    }
                    if (!(chainId !== undefined)) return [3 /*break*/, 5];
                    isMainnet = (0, networks_1.isMainnetByChainId)(chainId);
                    if (!isMainnet) return [3 /*break*/, 5];
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, AssetsContractController.getERC721AssetSymbol(checksummedAddress)];
                case 3:
                    symbol = _d.sent();
                    if (symbol) {
                        addressError = error_1.SYMBOL_ERROR;
                        errorContinue = true;
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _d.sent();
                    return [3 /*break*/, 5];
                case 5: return [3 /*break*/, 9];
                case 6:
                    if (!isENS(toAccount)) return [3 /*break*/, 8];
                    toEnsName = toAccount;
                    confusableCollection = (0, confusables_1.collectConfusables)(toEnsName);
                    return [4 /*yield*/, (0, ENSUtils_1.doENSLookup)(toAccount, chainId)];
                case 7:
                    resolvedAddress = _d.sent();
                    contactAlreadySaved = checkIfAddressAlreadySaved(resolvedAddress, addressBook, chainId, internalAccounts);
                    if (resolvedAddress) {
                        if (!contactAlreadySaved) {
                            addToAddressToAddressBook = true;
                        }
                        else {
                            addressError = contactAlreadySaved;
                        }
                        toAddressName = toAccount;
                        toEnsAddress = resolvedAddress;
                        addressReady = true;
                    }
                    else {
                        addressError = (0, i18n_1.strings)('transaction.could_not_resolve_ens');
                    }
                    return [3 /*break*/, 9];
                case 8:
                    if (toAccount && toAccount.length >= 42) {
                        addressError = (0, i18n_1.strings)('transaction.invalid_address');
                    }
                    _d.label = 9;
                case 9: return [2 /*return*/, {
                        addressError: addressError,
                        toEnsName: toEnsName,
                        addressReady: addressReady,
                        toEnsAddress: toEnsAddress,
                        addToAddressToAddressBook: addToAddressToAddressBook,
                        toAddressName: toAddressName,
                        errorContinue: errorContinue,
                        confusableCollection: confusableCollection
                    }];
            }
        });
    });
}
exports.validateAddressOrENS = validateAddressOrENS;
/** Method to evaluate if an input is a valid ethereum address
 * via QR code scanning.
 *
 * @param {string} input - a random string.
 * @returns {boolean} indicates if the string is a valid input.
 */
function isValidAddressInputViaQRCode(input) {
    if (input.includes(deeplinks_1.PROTOCOLS.ETHEREUM)) {
        var pathname = new URL(input).pathname;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        var _c = pathname.split('@'), address = _c[0], _1 = _c[1];
        return isValidHexAddress(address);
    }
    return isValidHexAddress(input);
}
exports.isValidAddressInputViaQRCode = isValidAddressInputViaQRCode;
/** Removes hex prefix from a string if it's there.
 *
 * @param {string} str
 * @returns {string}
 */
var stripHexPrefix = function (str) {
    if (typeof str !== 'string') {
        return str;
    }
    return (0, ethereumjs_util_1.isHexPrefixed)(str) ? str.slice(2) : str;
};
exports.stripHexPrefix = stripHexPrefix;
/**
 * Method to check if address is ENS and return the address
 *
 * @param {String} toAccount - Address or ENS
 * @param {String} chainId - The chain ID for the given address
 * @returns {String} - Address or null
 */
function getAddress(toAccount, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!isENS(toAccount)) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, ENSUtils_1.doENSLookup)(toAccount, chainId)];
                case 1: return [2 /*return*/, _c.sent()];
                case 2:
                    if (isValidHexAddress(toAccount, { mixedCaseUseChecksum: true })) {
                        return [2 /*return*/, toAccount];
                    }
                    return [2 /*return*/, null];
            }
        });
    });
}
exports.getAddress = getAddress;
var getTokenDetails = function (tokenAddress, userAddress, tokenId) { return __awaiter(void 0, void 0, void 0, function () {
    var AssetsContractController, tokenData, standard, name, symbol, decimals;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                AssetsContractController = Engine_1["default"].context.AssetsContractController;
                return [4 /*yield*/, AssetsContractController.getTokenStandardAndDetails(tokenAddress, userAddress, tokenId)];
            case 1:
                tokenData = _c.sent();
                standard = tokenData.standard, name = tokenData.name, symbol = tokenData.symbol, decimals = tokenData.decimals;
                if (standard === ERC721 || standard === ERC1155) {
                    return [2 /*return*/, {
                            name: name,
                            symbol: symbol,
                            standard: standard
                        }];
                }
                return [2 /*return*/, {
                        symbol: symbol,
                        decimals: decimals,
                        standard: standard
                    }];
        }
    });
}); };
exports.getTokenDetails = getTokenDetails;
var getTokenDecimal = function (address, networkClientId) { return __awaiter(void 0, void 0, void 0, function () {
    var AssetsContractController, tokenDecimal, err_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                AssetsContractController = Engine_1["default"].context.AssetsContractController;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 5]);
                return [4 /*yield*/, AssetsContractController.getERC20TokenDecimals(address, networkClientId)];
            case 2:
                tokenDecimal = _c.sent();
                return [2 /*return*/, tokenDecimal];
            case 3:
                err_1 = _c.sent();
                return [4 /*yield*/, Logger_1["default"].log('Error getting token decimal: ', err_1)];
            case 4:
                _c.sent();
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.getTokenDecimal = getTokenDecimal;
var shouldShowBlockExplorer = function (providerType, providerRpcTarget, networkConfigurations) {
    if (providerType === network_1.RPC) {
        return (0, networks_1.findBlockExplorerForRpc)(providerRpcTarget, networkConfigurations);
    }
    return true;
};
exports.shouldShowBlockExplorer = shouldShowBlockExplorer;
