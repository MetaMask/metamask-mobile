import { addHexPrefix } from 'ethereumjs-util';
import BN from 'bnjs4';
import { rawEncode, rawDecode } from 'ethereumjs-abi';
import BigNumber from 'bignumber.js';
import humanizeDuration from 'humanize-duration';
import {
  query,
  isSmartContractCode,
  ERC721,
  ERC1155,
  ORIGIN_METAMASK,
} from '@metamask/controller-utils';
import {
  isEIP1559Transaction,
  TransactionType,
  TransactionEnvelopeType,
} from '@metamask/transaction-controller';
import { swapsUtils } from '@metamask/swaps-controller';
import Engine from '../../core/Engine';
import I18n, { strings } from '../../../locales/i18n';
import { safeToChecksumAddress, toChecksumAddress } from '../address';
import {
  balanceToFiatNumber,
  BNToHex,
  hexToBN,
  renderFiatAddition,
  renderFromTokenMinimalUnit,
  renderFromWei,
  weiToFiat,
  weiToFiatNumber,
  toTokenMinimalUnit,
} from '../number';
import AppConstants from '../../core/AppConstants';
import { isMainnetByChainId } from '../networks';
import FIRST_PARTY_CONTRACT_NAMES from '../../constants/first-party-contracts';
import {
  UINT256_BN_MAX_VALUE,
  TX_SUBMITTED,
  TX_APPROVED,
  TX_UNAPPROVED,
  TX_PENDING,
  TX_CANCELLED,
  TX_REJECTED,
  TX_FAILED,
} from '../../constants/transaction';
import { NEGATIVE_TOKEN_DECIMALS } from '../../constants/error';
import {
  addCurrencies,
  multiplyCurrencies,
  subtractCurrencies,
} from '../conversion';
import {
  decGWEIToHexWEI,
  getValueFromWeiHex,
  formatETHFee,
  sumHexWEIs,
} from '../conversions';
import {
  addEth,
  addFiat,
  convertTokenToFiat,
  formatCurrency,
  getTransactionFee,
  roundExponential,
} from '../confirm-tx';

import Logger from '../../util/Logger';
import { handleMethodData } from '../../util/transaction-controller';
import EthQuery from '@metamask/eth-query';
import { EIP_7702_REVOKE_ADDRESS } from '../../components/Views/confirmations/hooks/7702/useEIP7702Accounts';
import { hasTransactionType } from '../../components/Views/confirmations/utils/transaction';

const { SAI_ADDRESS } = AppConstants;

export const TOKEN_METHOD_TRANSFER = 'transfer';
export const TOKEN_METHOD_APPROVE = 'approve';
export const TOKEN_METHOD_TRANSFER_FROM = 'transferfrom';
export const TOKEN_METHOD_INCREASE_ALLOWANCE = 'increaseAllowance';
export const TOKEN_METHOD_MINT = 'mint';
export const CONTRACT_METHOD_DEPLOY = 'deploy';
export const CONNEXT_METHOD_DEPOSIT = 'connextdeposit';
export const TOKEN_METHOD_SET_APPROVAL_FOR_ALL = 'setapprovalforall';

export const SEND_ETHER_ACTION_KEY = 'sentEther';
export const DEPLOY_CONTRACT_ACTION_KEY = 'deploy';
export const APPROVE_ACTION_KEY = 'approve';
export const SEND_TOKEN_ACTION_KEY = 'transfer';
export const TRANSFER_FROM_ACTION_KEY = 'transferfrom';
export const UNKNOWN_FUNCTION_KEY = 'unknownFunction';
export const SMART_CONTRACT_INTERACTION_ACTION_KEY = 'smartContractInteraction';
export const SWAPS_TRANSACTION_ACTION_KEY = 'swapsTransaction';
export const BRIDGE_TRANSACTION_ACTION_KEY = 'bridgeTransaction';
export const INCREASE_ALLOWANCE_ACTION_KEY = 'increaseAllowance';
export const SET_APPROVE_FOR_ALL_ACTION_KEY = 'setapprovalforall';
export const UPGRADE_SMART_ACCOUNT_ACTION_KEY = 'upgradeSmartAccount';
export const DOWNGRADE_SMART_ACCOUNT_ACTION_KEY = 'downgradeSmartAccount';

export const TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';
export const TRANSFER_FROM_FUNCTION_SIGNATURE = '0x23b872dd';
export const NFT_SAFE_TRANSFER_FROM_FUNCTION_SIGNATURE = '0xf242432a';
export const APPROVE_FUNCTION_SIGNATURE = '0x095ea7b3';
export const CONTRACT_CREATION_SIGNATURE = '0x60a060405260046060527f48302e31';
export const INCREASE_ALLOWANCE_SIGNATURE = '0x39509351';
export const SET_APPROVAL_FOR_ALL_SIGNATURE = '0xa22cb465';

// Common NFT method signatures
export const SAFE_MINT_SIGNATURE = '0x40c10f19'; // safeMint(address,uint256)
export const MINT_SIGNATURE = '0xa0712d68'; // mint(uint256)
export const MINT_TO_SIGNATURE = '0x3b4b1381'; // mintTo(address) - common in many NFT contracts
export const SAFE_MINT_WITH_DATA = '0x8832e6e3'; // safeMint(address,uint256,bytes)

export const TRANSACTION_TYPES = {
  APPROVE: 'transaction_approve',
  INCREASE_ALLOWANCE: 'transaction_increase_allowance',
  SET_APPROVAL_FOR_ALL: 'transaction_set_approval_for_all',
  RECEIVED: 'transaction_received',
  RECEIVED_COLLECTIBLE: 'transaction_received_collectible',
  RECEIVED_TOKEN: 'transaction_received_token',
  SENT: 'transaction_sent',
  SENT_COLLECTIBLE: 'transaction_sent_collectible',
  SENT_TOKEN: 'transaction_sent_token',
  SITE_INTERACTION: 'transaction_site_interaction',
  SWAPS_TRANSACTION: 'swaps_transaction',
  BRIDGE_TRANSACTION: 'bridge_transaction',
};

const MULTIPLIER_HEX = 16;

const { getSwapsContractAddress } = swapsUtils;
/**
 * Utility class with the single responsibility
 * of caching CollectibleAddresses
 */
class CollectibleAddresses {
  static cache = {};
}

/**
 * Object containing all known action keys, to be used in transaction review
 */
const reviewActionKeys = {
  [SEND_TOKEN_ACTION_KEY]: strings('transactions.tx_review_transfer'),
  [SEND_ETHER_ACTION_KEY]: strings('transactions.tx_review_confirm'),
  [DEPLOY_CONTRACT_ACTION_KEY]: strings(
    'transactions.tx_review_contract_deployment',
  ),
  [TRANSFER_FROM_ACTION_KEY]: strings('transactions.tx_review_transfer_from'),
  [SMART_CONTRACT_INTERACTION_ACTION_KEY]: strings(
    'transactions.tx_review_unknown',
  ),
  [APPROVE_ACTION_KEY]: strings('transactions.tx_review_approve'),
  [INCREASE_ALLOWANCE_ACTION_KEY]: strings(
    'transactions.tx_review_increase_allowance',
  ),
  [SET_APPROVE_FOR_ALL_ACTION_KEY]: strings(
    'transactions.tx_review_set_approval_for_all',
  ),
  [TransactionType.stakingClaim]: strings(
    'transactions.tx_review_staking_claim',
  ),
  [TransactionType.stakingDeposit]: strings(
    'transactions.tx_review_staking_deposit',
  ),
  [TransactionType.stakingUnstake]: strings(
    'transactions.tx_review_staking_unstake',
  ),
  [TransactionType.lendingDeposit]: strings(
    'transactions.tx_review_lending_deposit',
  ),
  [TransactionType.lendingWithdraw]: strings(
    'transactions.tx_review_lending_withdraw',
  ),
  [TransactionType.musdConversion]: strings(
    'transactions.tx_review_musd_conversion',
  ),
};

/**
 * Object containing all known action keys, to be used in transactions list
 */
const actionKeys = {
  [SEND_TOKEN_ACTION_KEY]: strings('transactions.sent_tokens'),
  [TRANSFER_FROM_ACTION_KEY]: strings('transactions.sent_collectible'),
  [DEPLOY_CONTRACT_ACTION_KEY]: strings('transactions.contract_deploy'),
  [SMART_CONTRACT_INTERACTION_ACTION_KEY]: strings(
    'transactions.smart_contract_interaction',
  ),
  [SWAPS_TRANSACTION_ACTION_KEY]: strings('transactions.swaps_transaction'),
  [BRIDGE_TRANSACTION_ACTION_KEY]: strings('transactions.bridge_transaction'),
  [APPROVE_ACTION_KEY]: strings('transactions.approve'),
  [INCREASE_ALLOWANCE_ACTION_KEY]: strings('transactions.increase_allowance'),
  [SET_APPROVE_FOR_ALL_ACTION_KEY]: strings(
    'transactions.set_approval_for_all',
  ),
  [UPGRADE_SMART_ACCOUNT_ACTION_KEY]: strings(
    'transactions.smart_account_upgrade',
  ),
  [DOWNGRADE_SMART_ACCOUNT_ACTION_KEY]: strings(
    'transactions.smart_account_downgrade',
  ),
  [TOKEN_METHOD_MINT]: strings('transactions.mint'),
  [TransactionType.stakingClaim]: strings(
    'transactions.tx_review_staking_claim',
  ),
  [TransactionType.stakingDeposit]: strings(
    'transactions.tx_review_staking_deposit',
  ),
  [TransactionType.stakingUnstake]: strings(
    'transactions.tx_review_staking_unstake',
  ),
  [TransactionType.lendingDeposit]: strings(
    'transactions.tx_review_lending_deposit',
  ),
  [TransactionType.lendingWithdraw]: strings(
    'transactions.tx_review_lending_withdraw',
  ),
  [TransactionType.perpsDeposit]: strings(
    'transactions.tx_review_perps_deposit',
  ),
  [TransactionType.predictDeposit]: strings(
    'transactions.tx_review_predict_deposit',
  ),
  [TransactionType.predictClaim]: strings(
    'transactions.tx_review_predict_claim',
  ),
  [TransactionType.predictWithdraw]: strings(
    'transactions.tx_review_predict_withdraw',
  ),
  [TransactionType.musdConversion]: strings(
    'transactions.tx_review_musd_conversion',
  ),
};

/**
 * Checks if a transaction is a legacy transaction by examining its type.
 * Legacy transactions are identified by the TransactionEnvelopeType.legacy type.
 *
 * @param {object} transactionMeta - The transaction metadata to check
 * @returns {boolean} true if the transaction is a legacy transaction, false otherwise
 */
export function isLegacyTransaction(transactionMeta) {
  return transactionMeta?.txParams?.type === TransactionEnvelopeType.legacy;
}

/**
 * Generates transfer data for specified method
 *
 * @param {String} type - Method to use to generate data
 * @param {Object} opts - Optional asset parameters
 * @returns {String} - String containing the generated transfer data
 */
export function generateTransferData(type = undefined, opts = {}) {
  if (!type) {
    throw new TypeError('[transactions] type must be defined');
  }
  switch (type) {
    case 'transfer':
      if (!opts.toAddress || !opts.amount) {
        throw new Error(
          `[transactions] 'toAddress' and 'amount' must be defined for 'type' transfer`,
        );
      }
      return (
        TRANSFER_FUNCTION_SIGNATURE +
        Array.prototype.map
          .call(
            rawEncode(
              ['address', 'uint256'],
              [opts.toAddress, addHexPrefix(opts.amount)],
            ),
            (x) => ('00' + x.toString(16)).slice(-2),
          )
          .join('')
      );
    case 'transferFrom':
      return (
        TRANSFER_FROM_FUNCTION_SIGNATURE +
        Array.prototype.map
          .call(
            rawEncode(
              ['address', 'address', 'uint256'],
              [opts.fromAddress, opts.toAddress, addHexPrefix(opts.tokenId)],
            ),
            (x) => ('00' + x.toString(16)).slice(-2),
          )
          .join('')
      );
    case 'safeTransferFrom':
      return (
        NFT_SAFE_TRANSFER_FROM_FUNCTION_SIGNATURE +
        Array.prototype.map
          .call(
            rawEncode(
              ['address', 'address', 'uint256', 'uint256'],
              [
                opts.fromAddress,
                opts.toAddress,
                addHexPrefix(opts.tokenId),
                opts.amount,
              ],
            ),
            (x) => ('00' + x.toString(16)).slice(-2),
          )
          .join('')
      );
  }
}

/**
 * Extracts the four-byte signature from Ethereum transaction data.
 * @param {string | undefined} data The transaction data.
 * @returns {string | undefined} The four-byte signature if data is provided, otherwise undefined.
 */
export function getFourByteSignature(data) {
  return data?.substring(0, 10)?.toLowerCase();
}

/**
 * Checks if the transaction data corresponds to an "approve" or "increase allowance" function call.
 * @param {string} data The transaction data.
 * @returns {boolean} True if the transaction is an "approve" or "increase allowance" call, false otherwise.
 */
export function isApprovalTransaction(data) {
  const fourByteSignature = getFourByteSignature(data);
  return [
    APPROVE_FUNCTION_SIGNATURE,
    INCREASE_ALLOWANCE_SIGNATURE,
    SET_APPROVAL_FOR_ALL_SIGNATURE,
  ].includes(fourByteSignature);
}

/**
 * Generates ERC20 approval data
 *
 * @param {object} opts - Object containing spender address, value and data
 * @param {string | null} opts.spender - The address of the spender
 * @param {string} opts.value - The amount of tokens to be approved or increased
 * @param {string} [opts.data] - The data of the transaction
 * @returns {String} - String containing the generated data, by default for approve method
 */
export function generateApprovalData(opts) {
  const { spender, value, data } = opts;

  if (!spender || !value) {
    throw new Error(
      `[transactions] 'spender' and 'value' must be defined for 'type' approve or increaseAllowance`,
    );
  }

  const functionSignature =
    getFourByteSignature(data) ?? APPROVE_FUNCTION_SIGNATURE;

  return (
    functionSignature +
    Array.prototype.map
      .call(
        rawEncode(['address', 'uint256'], [spender, addHexPrefix(value)]),
        (x) => ('00' + x.toString(16)).slice(-2),
      )
      .join('')
  );
}

export function decodeApproveData(data) {
  return {
    spenderAddress: addHexPrefix(data.substr(34, 40)),
    encodedAmount: data.substr(74, 138),
  };
}

const BASE = 4 * 16;

/**
 * Decode transfer data for specified method data
 *
 * @param {String} type - Method to use to generate data
 * @param {String} data - Data to decode
 * @returns {Array} - Object containing the decoded transfer data
 */
export function decodeTransferData(type, data) {
  switch (type) {
    case 'transfer': {
      const encodedAddress = data.substring(10, BASE + 10);
      const encodedAmount = data.substring(74, BASE + 74);
      const bufferEncodedAddress = rawEncode(
        ['address'],
        [addHexPrefix(encodedAddress)],
      );
      return [
        addHexPrefix(rawDecode(['address'], bufferEncodedAddress)[0]),
        parseInt(encodedAmount, 16).toString(),
        encodedAmount,
      ];
    }
    case 'transferFrom': {
      const encodedFromAddress = data.substring(10, BASE + 10);
      const encodedToAddress = data.substring(74, BASE + 74);
      const encodedTokenId = data.substring(138, BASE + 138);
      const bufferEncodedFromAddress = rawEncode(
        ['address'],
        [addHexPrefix(encodedFromAddress)],
      );
      const bufferEncodedToAddress = rawEncode(
        ['address'],
        [addHexPrefix(encodedToAddress)],
      );
      return [
        addHexPrefix(rawDecode(['address'], bufferEncodedFromAddress)[0]),
        addHexPrefix(rawDecode(['address'], bufferEncodedToAddress)[0]),
        parseInt(encodedTokenId, 16).toString(),
      ];
    }
  }
}

/**
 * Normalizes a hexadecimal string to lowercase.
 * @param {string} hexString - The hexadecimal string to normalize.
 * @returns {string} - The normalized lowercase hexadecimal string.
 */
function normalizeHex(hexString) {
  return hexString?.toLowerCase() || '';
}

/**
 * @typedef {Object} MethodData
 * @property {string} name - The method name
 */

/**
 * Returns method data object for a transaction dat
 *
 * @param {string} data - Transaction data
 * @returns {MethodData} - Method data object containing the name if is valid
 */
export async function getMethodData(data, networkClientId) {
  if (data.length < 10) return {};

  const fourByteSignature = normalizeHex(getFourByteSignature(data));

  if (fourByteSignature === normalizeHex(TRANSFER_FUNCTION_SIGNATURE)) {
    return { name: TOKEN_METHOD_TRANSFER };
  } else if (
    fourByteSignature === normalizeHex(TRANSFER_FROM_FUNCTION_SIGNATURE)
  ) {
    return { name: TOKEN_METHOD_TRANSFER_FROM };
  } else if (fourByteSignature === normalizeHex(APPROVE_FUNCTION_SIGNATURE)) {
    return { name: TOKEN_METHOD_APPROVE };
  } else if (fourByteSignature === normalizeHex(INCREASE_ALLOWANCE_SIGNATURE)) {
    return { name: TOKEN_METHOD_INCREASE_ALLOWANCE };
  } else if (
    fourByteSignature === normalizeHex(SET_APPROVAL_FOR_ALL_SIGNATURE)
  ) {
    return { name: TOKEN_METHOD_SET_APPROVAL_FOR_ALL };
  } else if (
    normalizeHex(data.substr(0, 32)) ===
    normalizeHex(CONTRACT_CREATION_SIGNATURE)
  ) {
    return { name: CONTRACT_METHOD_DEPLOY };
  }
  // Common NFT mint methods
  else if (
    fourByteSignature === normalizeHex(SAFE_MINT_SIGNATURE) ||
    fourByteSignature === normalizeHex(MINT_SIGNATURE) ||
    fourByteSignature === normalizeHex(MINT_TO_SIGNATURE) ||
    fourByteSignature === normalizeHex(SAFE_MINT_WITH_DATA)
  ) {
    return { name: TOKEN_METHOD_MINT };
  }

  // If it's a new method, use on-chain method registry
  try {
    const registryObject = await handleMethodData(
      fourByteSignature,
      networkClientId,
    );
    if (registryObject) {
      return registryObject.parsedRegistryMethod;
    }
  } catch (e) {
    // Ignore and return empty object
  }
  return {};
}

/**
 * Returns wether the given address is a contract
 *
 * @param {string} address - Ethereum address
 * @param {string} chainId - Current chainId
 * @param {string | undefined} networkClientId - ID of the network client
 * @returns {Promise<boolean>} - Whether the given address is a contract
 */
export async function isSmartContractAddress(
  address,
  chainId,
  networkClientId = undefined,
) {
  if (!address) return false;

  address = toChecksumAddress(address);

  // If in contract map we don't need to cache it
  if (
    isMainnetByChainId(chainId) &&
    Engine.context.TokenListController.state.tokensChainsCache?.[chainId]
      ?.data?.[address]
  ) {
    return Promise.resolve(true);
  }

  const { NetworkController } = Engine.context;
  const finalNetworkClientId =
    networkClientId ?? NetworkController.findNetworkClientIdByChainId(chainId);
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(finalNetworkClientId).provider,
  );

  const code = address
    ? await query(ethQuery, 'getCode', [address])
    : undefined;

  return isSmartContractCode(code);
}

/**
 * Returns wether the given address is an ERC721 contract
 *
 * @param {string} address - Ethereum address
 * @param {string} tokenId - A possible collectible id
 * @returns {boolean} - Wether the given address is an ERC721 contract
 */
export async function isCollectibleAddress(address, tokenId) {
  const cache = CollectibleAddresses.cache[address];
  if (cache) {
    return Promise.resolve(cache);
  }
  const { AssetsContractController } = Engine.context;
  // Hack to know if the address is a collectible smart contract
  // for now this method is called from tx element so we have the respective 'tokenId'
  const ownerOf = await AssetsContractController.getERC721OwnerOf(
    address,
    tokenId,
  );
  const isCollectibleAddress = ownerOf && ownerOf !== '0x';
  CollectibleAddresses.cache[address] = isCollectibleAddress;
  return isCollectibleAddress;
}

/**
 * Returns corresponding transaction action key
 *
 * @param {object} transaction - Transaction object
 * @param {string} chainId - Current chainId
 * @returns {string} - Corresponding transaction action key
 */
export async function getTransactionActionKey(transaction, chainId) {
  const { networkClientId, type } = transaction ?? {};
  const txParams = transaction.txParams ?? transaction.transaction ?? {};
  const { authorizationList, data, to } = txParams;

  if (
    [
      TransactionType.stakingClaim,
      TransactionType.stakingDeposit,
      TransactionType.stakingUnstake,
      TransactionType.lendingDeposit,
      TransactionType.lendingWithdraw,
      TransactionType.perpsDeposit,
      TransactionType.musdConversion,
    ].includes(type)
  ) {
    return type;
  }

  // Handle deployContract type explicitly
  if (type === TransactionType.deployContract) {
    return CONTRACT_METHOD_DEPLOY;
  }

  // Handle NFT/collectible transfers - ERC721 and ERC1155
  // tokenMethodTransferFrom is used for ERC721
  // tokenMethodSafeTransferFrom is used for ERC1155
  if (
    type === TransactionType.tokenMethodTransferFrom ||
    type === TransactionType.tokenMethodSafeTransferFrom ||
    type === 'transferfrom' // Legacy/fallback check
  ) {
    return TRANSFER_FROM_ACTION_KEY;
  }

  if (hasTransactionType(transaction, [TransactionType.predictDeposit])) {
    return TransactionType.predictDeposit;
  }

  if (hasTransactionType(transaction, [TransactionType.predictClaim])) {
    return TransactionType.predictClaim;
  }

  if (hasTransactionType(transaction, [TransactionType.predictWithdraw])) {
    return TransactionType.predictWithdraw;
  }

  if (!to) {
    return CONTRACT_METHOD_DEPLOY;
  }

  if (to === getSwapsContractAddress(chainId)) {
    return SWAPS_TRANSACTION_ACTION_KEY;
  }

  if (transaction.type === TransactionType.bridge) {
    return BRIDGE_TRANSACTION_ACTION_KEY;
  }

  // Check if the 'to' address is a known bridge contract for this chainId
  const bridgeAddress = FIRST_PARTY_CONTRACT_NAMES.Bridge?.[chainId];
  if (bridgeAddress && to?.toLowerCase() === bridgeAddress.toLowerCase()) {
    return BRIDGE_TRANSACTION_ACTION_KEY;
  }

  // if data in transaction try to get method data
  if (data && data !== '0x') {
    const { name } = await getMethodData(data, networkClientId);
    if (name) return name;
  }

  if (type === TransactionType.contractInteraction) {
    return SMART_CONTRACT_INTERACTION_ACTION_KEY;
  }

  const toSmartContract =
    transaction.toSmartContract !== undefined
      ? transaction.toSmartContract
      : await isSmartContractAddress(to, chainId);

  const authorizationAddress = authorizationList?.[0]?.address;
  const isDowngrade =
    Boolean(authorizationAddress) &&
    authorizationAddress === EIP_7702_REVOKE_ADDRESS;

  if (isDowngrade) {
    return DOWNGRADE_SMART_ACCOUNT_ACTION_KEY;
  }

  const isUpgrade =
    Boolean(authorizationAddress) &&
    authorizationAddress !== EIP_7702_REVOKE_ADDRESS;

  if (isUpgrade) {
    return UPGRADE_SMART_ACCOUNT_ACTION_KEY;
  }

  if (toSmartContract) {
    return SMART_CONTRACT_INTERACTION_ACTION_KEY;
  }

  return SEND_ETHER_ACTION_KEY;
}

/**
 * Checks if a transaction is in an incomplete state (not yet confirmed)
 * Includes pending, rejected, cancelled, and failed transactions
 *
 * @param {string | undefined} status - The transaction status
 * @returns {boolean} - Whether the transaction is incomplete
 */
export function isTransactionIncomplete(status) {
  if (!status) return false;
  return [
    TX_SUBMITTED,
    TX_APPROVED,
    TX_UNAPPROVED,
    TX_PENDING,
    TX_CANCELLED,
    TX_REJECTED,
    TX_FAILED,
  ].includes(status);
}

/**
 * Returns corresponding transaction type message to show in UI
 *
 * @param {object} tx - Transaction object
 * @param {string} selectedAddress - Current account public address
 * @returns {string} - Transaction type message
 */
export async function getActionKey(tx, selectedAddress, ticker, chainId) {
  const actionKey = await getTransactionActionKey(tx, chainId);

  // Handle transferFrom - need to distinguish between NFT and ERC20
  // Both return 'transferfrom' but have different transaction types
  if (actionKey === TRANSFER_FROM_ACTION_KEY) {
    const fromAddress = safeToChecksumAddress(tx.txParams.from)?.toLowerCase();
    const selectedAddr = selectedAddress?.toLowerCase();
    const sentByUser = fromAddress === selectedAddr;

    // Check if it's an NFT/collectible transfer (ERC721/ERC1155)
    const isNFTTransfer =
      tx.type === TransactionType.tokenMethodTransferFrom ||
      tx.type === TransactionType.tokenMethodSafeTransferFrom;

    if (isNFTTransfer) {
      // NFT transfers - show collectible messages
      if (sentByUser) {
        return strings('transactions.sent_collectible');
      }
      return strings('transactions.received_collectible');
    }

    // ERC20 transferFrom - decode actual recipient from transaction data
    // tx.txParams.to is the token contract, not the recipient
    let toAddress;
    try {
      // transferFrom has 3 parameters (from, to, amount): 0x + 8 (sig) + 64*3 (params) = 202 chars
      if (tx.txParams.data && tx.txParams.data.length >= 202) {
        // Decode recipient from transferFrom(from, to, amount) calldata
        const [, decodedToAddress] = decodeTransferData(
          'transferFrom',
          tx.txParams.data,
        );
        toAddress = decodedToAddress?.toLowerCase();
      }
    } catch (error) {
      // If decoding fails, fall back to transferInformation if available
      if (tx.transferInformation?.recipient) {
        toAddress = tx.transferInformation.recipient?.toLowerCase();
      }
    }

    // Determine direction based on whether user is the recipient
    const isRecipient = toAddress && toAddress === selectedAddr;

    if (isRecipient) {
      return strings('transactions.received_tokens');
    }
    return strings('transactions.sent_tokens');
  }

  // Handle token transfers with direction logic (similar to ETH transfers)
  if (actionKey === SEND_TOKEN_ACTION_KEY) {
    const fromAddress = safeToChecksumAddress(tx.txParams.from)?.toLowerCase();
    const toAddress = safeToChecksumAddress(tx.txParams.to)?.toLowerCase();
    const selectedAddr = selectedAddress?.toLowerCase();

    const sentByUser = fromAddress === selectedAddr;
    const incoming = !sentByUser;
    const selfSent = fromAddress === selectedAddr && toAddress === selectedAddr;

    if (selfSent) {
      return strings('transactions.self_sent_tokens');
    }

    if (incoming) {
      return strings('transactions.received_tokens');
    }

    return strings('transactions.sent_tokens');
  }

  if (actionKey === SEND_ETHER_ACTION_KEY) {
    let currencySymbol = ticker;

    if (tx?.isTransfer) {
      // Third party sending wrong token symbol
      if (
        tx.transferInformation.contractAddress === SAI_ADDRESS.toLowerCase()
      ) {
        tx.transferInformation.symbol = 'SAI';
      }
      currencySymbol = tx.transferInformation.symbol;
    }

    // Determine direction based on who initiated the transaction (txParams.from)
    // This matches the logic in decodeIncomingTransfer (utils.js line 307)
    // For both token transfers and ETH transfers:
    // - If txParams.from === selectedAddress, user sent it (outgoing)
    // - If txParams.from !== selectedAddress, user received it (incoming)
    const fromAddress = safeToChecksumAddress(tx.txParams.from)?.toLowerCase();
    const toAddress = safeToChecksumAddress(tx.txParams.to)?.toLowerCase();
    const selectedAddr = selectedAddress?.toLowerCase();

    // Check if transaction was sent by the selected address
    const sentByUser = fromAddress === selectedAddr;
    const incoming = !sentByUser;
    const selfSent = fromAddress === selectedAddr && toAddress === selectedAddr;

    // Check if transaction is incomplete (not confirmed)
    const isIncomplete = isTransactionIncomplete(tx.status);

    // Handle self-sent transactions first
    if (selfSent) {
      return currencySymbol
        ? strings('transactions.self_sent_unit', { unit: currencySymbol })
        : strings('transactions.self_sent_ether');
    }

    if (incoming) {
      return currencySymbol
        ? strings('transactions.received_unit', { unit: currencySymbol })
        : strings('transactions.received_ether');
    }
    // For outgoing transactions, check status
    if (isIncomplete) {
      return currencySymbol
        ? strings('transactions.send_unit', { unit: currencySymbol })
        : strings('transactions.send_ether');
    }
    return currencySymbol
      ? strings('transactions.sent_unit', { unit: currencySymbol })
      : strings('transactions.sent_ether');
  }
  const transactionActionKey = actionKeys[actionKey];

  if (transactionActionKey) {
    return transactionActionKey;
  }

  return actionKey;
}

/**
 * Returns corresponding transaction function type
 *
 * @param {object} tx - Transaction object
 * @param {string} chainId - Current chainId
 * @returns {string} - Transaction function type
 */
export async function getTransactionReviewActionKey(transaction, chainId) {
  const actionKey = await getTransactionActionKey(transaction, chainId);
  const transactionReviewActionKey = reviewActionKeys[actionKey];
  if (transactionReviewActionKey) {
    return transactionReviewActionKey;
  }

  return actionKey;
}

/**
 * Returns corresponding ticker, defined or ETH
 *
 * @param {string} - Ticker
 * @returns {string} - Corresponding ticker or ETH
 */
export function getTicker(ticker) {
  return ticker || strings('unit.eth');
}

/**
 * Construct ETH asset object
 *
 * @param {string} ticker - Ticker
 * @returns {object} - ETH object
 */
export function getEther(ticker) {
  return {
    name: 'Ether',
    address: '',
    symbol: ticker || strings('unit.eth'),
    logo: '../images/eth-logo-new.png',
    isETH: true,
  };
}

/**
 * Select the correct tx recipient name from available data
 *
 * @param {object} config
 * @param {object} config.addressBook - Object of address book entries
 * @param {string} config.chainId - network id
 * @param {string} config.toAddress - hex address of tx recipient
 * @param {array} config.internalAccounts - array of accounts objects from AccountsController
 * @param {string} config.ensRecipient - name of ens recipient
 * @returns {string} - recipient name
 */
export function getTransactionToName({
  addressBook,
  chainId,
  toAddress,
  internalAccounts,
  ensRecipient,
}) {
  if (ensRecipient) {
    return ensRecipient;
  }

  const networkAddressBook = addressBook[chainId];
  const checksummedToAddress = toChecksumAddress(toAddress);

  // Convert internalAccounts array to a map for quick lookup
  const internalAccountsMap = internalAccounts.reduce((acc, account) => {
    acc[toChecksumAddress(account.address)] = account;
    return acc;
  }, {});

  const matchingAccount = internalAccountsMap[checksummedToAddress];

  const transactionToName =
    (networkAddressBook &&
      networkAddressBook[checksummedToAddress] &&
      networkAddressBook[checksummedToAddress].name) ||
    (matchingAccount && matchingAccount.metadata.name);

  return transactionToName;
}

/**
 * Return a boolen if the transaction should be flagged to add the account added label
 *
 * @param {object} transaction - Transaction object get time
 * @param {object} addedAccountTime - Time the account was added to the wallet
 * @param {object} accountAddedTimeInsertPointFound - Flag to see if the import time was already found
 */
export function addAccountTimeFlagFilter(
  transaction,
  addedAccountTime,
  accountAddedTimeInsertPointFound,
) {
  return (
    transaction.time <= addedAccountTime && !accountAddedTimeInsertPointFound
  );
}

//Leaving here a comment to re-visit this function since it's probably be possible to deprecate
export function getNormalizedTxState(state) {
  return state.transaction
    ? { ...state.transaction, ...state.transaction.transaction }
    : undefined;
}

export const getActiveTabUrl = ({ browser = {} }) =>
  browser.tabs &&
  browser.activeTab &&
  browser.tabs.find(({ id }) => id === browser.activeTab)?.url;

export const calculateAmountsEIP1559 = ({
  value,
  nativeCurrency,
  currentCurrency,
  conversionRate,
  gasFeeMinConversion,
  gasFeeMinNative,
  gasFeeMaxNative,
  gasFeeMaxConversion,
  gasFeeMaxHex,
  gasFeeMinHex,
}) => {
  // amount numbers
  const amountConversion = getValueFromWeiHex({
    value,
    fromCurrency: nativeCurrency,
    toCurrency: currentCurrency,
    conversionRate,
    numberOfDecimals: 2,
  });
  const amountNative = getValueFromWeiHex({
    value,
    fromCurrency: nativeCurrency,
    toCurrency: nativeCurrency,
    conversionRate,
    numberOfDecimals: 6,
  });

  // Total numbers
  const totalMinNative = addEth(gasFeeMinNative, amountNative);
  const totalMinConversion = addFiat(gasFeeMinConversion, amountConversion);
  const totalMaxNative = addEth(gasFeeMaxNative, amountNative);
  const totalMaxConversion = addFiat(gasFeeMaxConversion, amountConversion);

  const totalMinHex = addCurrencies(gasFeeMinHex, value, {
    toNumericBase: 'hex',
    aBase: MULTIPLIER_HEX,
    bBase: MULTIPLIER_HEX,
  });

  const totalMaxHex = addCurrencies(gasFeeMaxHex, value, {
    toNumericBase: 'hex',
    aBase: MULTIPLIER_HEX,
    bBase: MULTIPLIER_HEX,
  });

  return {
    totalMinNative,
    totalMinConversion,
    totalMaxNative,
    totalMaxConversion,
    totalMinHex,
    totalMaxHex,
  };
};

export const calculateEthEIP1559 = ({
  nativeCurrency,
  currentCurrency,
  totalMinNative,
  totalMinConversion,
  totalMaxNative,
  totalMaxConversion,
}) => {
  const renderableTotalMinNative = formatETHFee(totalMinNative, nativeCurrency);
  const renderableTotalMinConversion = formatCurrency(
    totalMinConversion,
    currentCurrency,
  );

  const renderableTotalMaxNative = formatETHFee(totalMaxNative, nativeCurrency);
  const renderableTotalMaxConversion = formatCurrency(
    totalMaxConversion,
    currentCurrency,
  );
  return [
    renderableTotalMinNative,
    renderableTotalMinConversion,
    renderableTotalMaxNative,
    renderableTotalMaxConversion,
  ];
};

export const calculateERC20EIP1559 = ({
  currentCurrency,
  nativeCurrency,
  conversionRate,
  exchangeRate,
  tokenAmount,
  totalMinConversion,
  totalMaxConversion,
  symbol,
  totalMinNative,
  totalMaxNative,
}) => {
  const tokenAmountConversion = convertTokenToFiat({
    value: tokenAmount,
    toCurrency: currentCurrency,
    conversionRate,
    contractExchangeRate: exchangeRate,
  });

  const tokenTotalMinConversion = roundExponential(
    addFiat(tokenAmountConversion, totalMinConversion),
  );
  const tokenTotalMaxConversion = roundExponential(
    addFiat(tokenAmountConversion, totalMaxConversion),
  );

  const renderableTotalMinConversion = formatCurrency(
    tokenTotalMinConversion,
    currentCurrency,
  );
  const renderableTotalMaxConversion = formatCurrency(
    tokenTotalMaxConversion,
    currentCurrency,
  );

  const renderableTotalMinNative = `${formatETHFee(
    tokenAmount,
    symbol,
  )} + ${formatETHFee(totalMinNative, nativeCurrency)}`;
  const renderableTotalMaxNative = `${formatETHFee(
    tokenAmount,
    symbol,
  )} + ${formatETHFee(totalMaxNative, nativeCurrency)}`;
  return [
    renderableTotalMinNative,
    renderableTotalMinConversion,
    renderableTotalMaxNative,
    renderableTotalMaxConversion,
  ];
};

export const calculateEIP1559Times = ({
  suggestedMaxPriorityFeePerGas,
  suggestedMaxFeePerGas,
  selectedOption,
  recommended,
  gasFeeEstimates,
}) => {
  let timeEstimate = strings('times_eip1559.unknown');
  let timeEstimateColor = 'grey';
  let timeEstimateId;

  const LOW = AppConstants.GAS_OPTIONS.LOW;
  const MEDIUM = AppConstants.GAS_OPTIONS.MEDIUM;
  const HIGH = AppConstants.GAS_OPTIONS.HIGH;

  if (!recommended) recommended = MEDIUM;

  if (!selectedOption) {
    timeEstimateColor = 'grey';
  } else if (recommended === HIGH) {
    if (selectedOption === HIGH) timeEstimateColor = 'green';
    else timeEstimateColor = 'red';
  } else if (selectedOption === LOW) {
    timeEstimateColor = 'red';
  } else {
    timeEstimateColor = 'green';
  }

  try {
    const language = I18n.locale.substr(0, 2);

    const timeParams = {
      language,
      fallbacks: ['en'],
    };

    if (
      selectedOption &&
      gasFeeEstimates &&
      gasFeeEstimates[LOW] &&
      gasFeeEstimates[MEDIUM] &&
      gasFeeEstimates[HIGH]
    ) {
      let hasTime = false;
      if (selectedOption === LOW && gasFeeEstimates[LOW].maxWaitTimeEstimate) {
        timeEstimate = `${strings('times_eip1559.maybe')} ${humanizeDuration(
          gasFeeEstimates[LOW].maxWaitTimeEstimate,
          timeParams,
        )}`;
        timeEstimateId = AppConstants.GAS_TIMES.MAYBE;
        hasTime = true;
      } else if (
        selectedOption === MEDIUM &&
        gasFeeEstimates[LOW].maxWaitTimeEstimate
      ) {
        timeEstimate = `${strings('times_eip1559.likely')} ${humanizeDuration(
          gasFeeEstimates[LOW].maxWaitTimeEstimate,
          timeParams,
        )}`;
        timeEstimateId = AppConstants.GAS_TIMES.LIKELY;
        hasTime = true;
      } else if (
        selectedOption === HIGH &&
        gasFeeEstimates[HIGH].minWaitTimeEstimate
      ) {
        timeEstimate = `${strings(
          'times_eip1559.likely_in',
        )} ${humanizeDuration(
          gasFeeEstimates[HIGH].minWaitTimeEstimate,
          timeParams,
        )}`;
        timeEstimateId = AppConstants.GAS_TIMES.VERY_LIKELY;
        hasTime = true;
      }

      if (
        Number(suggestedMaxPriorityFeePerGas) >=
        Number(gasFeeEstimates[HIGH].suggestedMaxPriorityFeePerGas)
      ) {
        timeEstimate = `${strings(
          'times_eip1559.likely_in',
        )} ${humanizeDuration(
          gasFeeEstimates[HIGH].minWaitTimeEstimate,
          timeParams,
        )}`;
        timeEstimateColor = 'orange';
        timeEstimateId = AppConstants.GAS_TIMES.VERY_LIKELY;
      }

      if (hasTime) {
        return { timeEstimate, timeEstimateColor, timeEstimateId };
      }
    }

    const { GasFeeController } = Engine.context;
    const times = GasFeeController.getTimeEstimate(
      suggestedMaxPriorityFeePerGas,
      suggestedMaxFeePerGas,
    );

    if (
      !times ||
      times === 'unknown' ||
      Object.keys(times).length < 2 ||
      times.upperTimeBound === 'unknown'
    ) {
      timeEstimate = strings('times_eip1559.unknown');
      timeEstimateId = AppConstants.GAS_TIMES.UNKNOWN;
      timeEstimateColor = 'red';
    } else if (selectedOption === LOW) {
      timeEstimate = `${strings('times_eip1559.maybe')} ${humanizeDuration(
        times.upperTimeBound,
        timeParams,
      )}`;
      timeEstimateId = AppConstants.GAS_TIMES.MAYBE;
    } else if (selectedOption === MEDIUM) {
      timeEstimate = `${strings('times_eip1559.likely')} ${humanizeDuration(
        times.upperTimeBound,
        timeParams,
      )}`;
      timeEstimateId = AppConstants.GAS_TIMES.LIKELY;
    } else if (selectedOption === HIGH) {
      timeEstimate = `${strings(
        'times_eip1559.very_likely',
      )} ${humanizeDuration(times.upperTimeBound, timeParams)}`;
      timeEstimateId = AppConstants.GAS_TIMES.VERY_LIKELY;
    } else if (times.upperTimeBound === 0) {
      timeEstimate = `${strings('times_eip1559.at_least')} ${humanizeDuration(
        times.lowerTimeBound,
        timeParams,
      )}`;
      timeEstimateColor = 'red';
      timeEstimateId = AppConstants.GAS_TIMES.AT_LEAST;
    } else if (times.lowerTimeBound === 0) {
      timeEstimate = `${strings('times_eip1559.less_than')} ${humanizeDuration(
        times.upperTimeBound,
        timeParams,
      )}`;
      timeEstimateColor = 'green';
      timeEstimateId = AppConstants.GAS_TIMES.LESS_THAN;
    } else {
      timeEstimate = `${humanizeDuration(
        times.lowerTimeBound,
        timeParams,
      )} - ${humanizeDuration(times.upperTimeBound, timeParams)}`;
      timeEstimateId = AppConstants.GAS_TIMES.RANGE;
    }
  } catch (error) {
    Logger.log('ERROR ESTIMATING TIME', error);
  }
  if (!timeEstimateId) {
    timeEstimate = AppConstants.GAS_TIMES.UNKNOWN;
  }

  return { timeEstimate, timeEstimateColor, timeEstimateId };
};

export const calculateEIP1559GasFeeHexes = ({
  gasLimitHex,
  estimatedGasLimitHex,
  estimatedBaseFeeHex,
  suggestedMaxFeePerGasHex,
  suggestedMaxPriorityFeePerGasHex,
}) => {
  // Hex calculations
  const estimatedBaseFee_PLUS_suggestedMaxPriorityFeePerGasHex = addCurrencies(
    estimatedBaseFeeHex,
    suggestedMaxPriorityFeePerGasHex,
    {
      toNumericBase: 'hex',
      aBase: MULTIPLIER_HEX,
      bBase: MULTIPLIER_HEX,
    },
  );

  const maxPriorityFeePerGasTimesGasLimitHex = multiplyCurrencies(
    suggestedMaxPriorityFeePerGasHex,
    gasLimitHex,
    {
      toNumericBase: 'hex',
      multiplicandBase: MULTIPLIER_HEX,
      multiplierBase: MULTIPLIER_HEX,
    },
  );

  const gasFeeMinHex = multiplyCurrencies(
    estimatedBaseFee_PLUS_suggestedMaxPriorityFeePerGasHex,
    estimatedGasLimitHex || gasLimitHex,
    {
      toNumericBase: 'hex',
      multiplicandBase: MULTIPLIER_HEX,
      multiplierBase: MULTIPLIER_HEX,
    },
  );
  const gasFeeMaxHex = multiplyCurrencies(
    suggestedMaxFeePerGasHex,
    gasLimitHex,
    {
      toNumericBase: 'hex',
      multiplicandBase: MULTIPLIER_HEX,
      multiplierBase: MULTIPLIER_HEX,
    },
  );

  return {
    estimatedBaseFee_PLUS_suggestedMaxPriorityFeePerGasHex,
    maxPriorityFeePerGasTimesGasLimitHex,
    gasFeeMinHex,
    gasFeeMaxHex,
  };
};

export const parseTransactionEIP1559 = (
  {
    selectedGasFee,
    swapsParams,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    transactionState: { selectedAsset, transaction: { value, data } } = {
      selectedAsset: {},
      transaction: {},
    },
    gasFeeEstimates,
  },
  { onlyGas } = {},
) => {
  value = value || '0x0';

  const suggestedMaxPriorityFeePerGas = String(
    selectedGasFee.suggestedMaxPriorityFeePerGas,
  );
  const suggestedMaxFeePerGas = String(selectedGasFee.suggestedMaxFeePerGas);
  const estimatedBaseFee = selectedGasFee.estimatedBaseFee || '0';

  // Convert to hex
  const estimatedBaseFeeHex = decGWEIToHexWEI(estimatedBaseFee);
  const suggestedMaxPriorityFeePerGasHex = decGWEIToHexWEI(
    suggestedMaxPriorityFeePerGas,
  );
  const suggestedMaxFeePerGasHex = decGWEIToHexWEI(suggestedMaxFeePerGas);
  const gasLimitHex = BNToHex(new BN(selectedGasFee.suggestedGasLimit));
  const estimatedGasLimitHex =
    selectedGasFee.suggestedEstimatedGasLimit &&
    BNToHex(new BN(selectedGasFee.suggestedEstimatedGasLimit));

  const { timeEstimate, timeEstimateColor, timeEstimateId } =
    calculateEIP1559Times({
      suggestedMaxPriorityFeePerGas,
      suggestedMaxFeePerGas,
      selectedOption: selectedGasFee.selectedOption,
      recommended: selectedGasFee.recommended,
      gasFeeEstimates,
    });

  // eslint-disable-next-line prefer-const
  let { gasFeeMinHex, gasFeeMaxHex, maxPriorityFeePerGasTimesGasLimitHex } =
    calculateEIP1559GasFeeHexes({
      gasLimitHex,
      estimatedGasLimitHex,
      estimatedBaseFeeHex,
      suggestedMaxPriorityFeePerGasHex,
      suggestedMaxFeePerGasHex,
    });

  if (swapsParams) {
    const { tradeValue, isNativeAsset, sourceAmount } = swapsParams;
    gasFeeMinHex = addCurrencies(gasFeeMinHex, tradeValue, {
      toNumericBase: 'hex',
      aBase: MULTIPLIER_HEX,
      bBase: MULTIPLIER_HEX,
    });
    gasFeeMaxHex = addCurrencies(gasFeeMaxHex, tradeValue, {
      toNumericBase: 'hex',
      aBase: MULTIPLIER_HEX,
      bBase: MULTIPLIER_HEX,
    });

    if (isNativeAsset) {
      gasFeeMinHex = subtractCurrencies(gasFeeMinHex, sourceAmount, {
        toNumericBase: 'hex',
        aBase: MULTIPLIER_HEX,
        bBase: 10,
      });
      gasFeeMaxHex = subtractCurrencies(gasFeeMaxHex, sourceAmount, {
        toNumericBase: 'hex',
        aBase: MULTIPLIER_HEX,
        bBase: 10,
      });
    }
  }

  const maxPriorityFeeNative = getTransactionFee({
    value: maxPriorityFeePerGasTimesGasLimitHex,
    fromCurrency: nativeCurrency,
    toCurrency: nativeCurrency,
    numberOfDecimals: 6,
    conversionRate,
  });
  const maxPriorityFeeConversion = getTransactionFee({
    value: maxPriorityFeePerGasTimesGasLimitHex,
    fromCurrency: nativeCurrency,
    toCurrency: currentCurrency,
    numberOfDecimals: 2,
    conversionRate,
  });

  const renderableMaxPriorityFeeNative = formatETHFee(
    maxPriorityFeeNative,
    nativeCurrency,
    Boolean(maxPriorityFeePerGasTimesGasLimitHex) &&
      maxPriorityFeePerGasTimesGasLimitHex !== '0x0',
  );
  const renderableMaxPriorityFeeConversion = formatCurrency(
    maxPriorityFeeConversion,
    currentCurrency,
  );

  const maxFeePerGasNative = getTransactionFee({
    value: gasFeeMaxHex,
    fromCurrency: nativeCurrency,
    toCurrency: nativeCurrency,
    numberOfDecimals: 6,
    conversionRate,
  });
  const maxFeePerGasConversion = getTransactionFee({
    value: gasFeeMaxHex,
    fromCurrency: nativeCurrency,
    toCurrency: currentCurrency,
    numberOfDecimals: 2,
    conversionRate,
  });
  const renderableMaxFeePerGasNative = formatETHFee(
    maxFeePerGasNative,
    nativeCurrency,
    Boolean(gasFeeMaxHex) && gasFeeMaxHex !== '0x0',
  );
  const renderableMaxFeePerGasConversion = formatCurrency(
    maxFeePerGasConversion,
    currentCurrency,
  );

  // Gas fee min numbers
  const gasFeeMinNative = getTransactionFee({
    value: gasFeeMinHex,
    fromCurrency: nativeCurrency,
    toCurrency: nativeCurrency,
    numberOfDecimals: 6,
    conversionRate,
  });
  const gasFeeMinConversion = getTransactionFee({
    value: gasFeeMinHex,
    fromCurrency: nativeCurrency,
    toCurrency: currentCurrency,
    numberOfDecimals: 2,
    conversionRate,
  });

  // Gas fee max numbers
  const gasFeeMaxNative = getTransactionFee({
    value: gasFeeMaxHex,
    fromCurrency: nativeCurrency,
    toCurrency: nativeCurrency,
    numberOfDecimals: 6,
    conversionRate,
  });
  const gasFeeMaxConversion = getTransactionFee({
    value: gasFeeMaxHex,
    fromCurrency: nativeCurrency,
    toCurrency: currentCurrency,
    numberOfDecimals: 2,
    conversionRate,
  });

  const renderableGasFeeMinNative = formatETHFee(
    gasFeeMinNative,
    nativeCurrency,
    Boolean(gasFeeMinHex) && gasFeeMinHex !== '0x0',
  );
  const renderableGasFeeMinConversion = formatCurrency(
    gasFeeMinConversion,
    currentCurrency,
  );
  const renderableGasFeeMaxNative = formatETHFee(
    gasFeeMaxNative,
    nativeCurrency,
    Boolean(gasFeeMaxHex) && gasFeeMaxHex !== '0x0',
  );
  const renderableGasFeeMaxConversion = formatCurrency(
    gasFeeMaxConversion,
    currentCurrency,
  );

  // This is the total transaction value for comparing with account balance
  const valuePlusGasMaxHex = addCurrencies(gasFeeMaxHex, value, {
    toNumericBase: 'hex',
    aBase: MULTIPLIER_HEX,
    bBase: MULTIPLIER_HEX,
  });

  if (onlyGas) {
    return {
      gasFeeMinNative,
      renderableGasFeeMinNative,
      gasFeeMinConversion,
      renderableGasFeeMinConversion,
      gasFeeMaxNative,
      gasFeeMaxHex,
      renderableGasFeeMaxNative,
      gasFeeMaxConversion,
      renderableGasFeeMaxConversion,
      maxPriorityFeeNative,
      renderableMaxPriorityFeeNative,
      maxPriorityFeeConversion,
      renderableMaxPriorityFeeConversion,
      renderableMaxFeePerGasNative,
      renderableMaxFeePerGasConversion,
      timeEstimate,
      timeEstimateColor,
      timeEstimateId,
      estimatedBaseFee,
      estimatedBaseFeeHex,
      suggestedMaxPriorityFeePerGas,
      suggestedMaxPriorityFeePerGasHex,
      suggestedMaxFeePerGas,
      suggestedMaxFeePerGasHex,
      gasLimitHex,
      suggestedGasLimit: selectedGasFee.suggestedGasLimit,
      suggestedEstimatedGasLimit: selectedGasFee.suggestedEstimatedGasLimit,
      totalMaxHex: valuePlusGasMaxHex,
    };
  }

  const {
    totalMinNative,
    totalMinConversion,
    totalMaxNative,
    totalMaxConversion,
    totalMinHex,
    totalMaxHex,
  } = calculateAmountsEIP1559({
    value,
    nativeCurrency,
    currentCurrency,
    conversionRate,
    gasFeeMinConversion,
    gasFeeMinNative,
    gasFeeMaxNative,
    gasFeeMaxConversion,
    gasFeeMaxHex,
    gasFeeMinHex,
  });

  let renderableTotalMinNative,
    renderableTotalMinConversion,
    renderableTotalMaxNative,
    renderableTotalMaxConversion;

  if (selectedAsset.isETH || selectedAsset.tokenId) {
    [
      renderableTotalMinNative,
      renderableTotalMinConversion,
      renderableTotalMaxNative,
      renderableTotalMaxConversion,
    ] = calculateEthEIP1559({
      nativeCurrency,
      currentCurrency,
      totalMinNative,
      totalMinConversion,
      totalMaxNative,
      totalMaxConversion,
    });
  } else {
    const { address, symbol = 'ERC20', decimals } = selectedAsset;

    const [, , rawAmount] = decodeTransferData('transfer', data);
    const rawAmountString = parseInt(rawAmount, 16).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const tokenAmount = renderFromTokenMinimalUnit(rawAmountString, decimals);

    const exchangeRate = contractExchangeRates[address]?.price;

    [
      renderableTotalMinNative,
      renderableTotalMinConversion,
      renderableTotalMaxNative,
      renderableTotalMaxConversion,
    ] = calculateERC20EIP1559({
      currentCurrency,
      nativeCurrency,
      conversionRate,
      exchangeRate,
      tokenAmount,
      totalMinConversion,
      totalMaxConversion,
      symbol,
      totalMinNative,
      totalMaxNative,
    });
  }

  return {
    gasFeeMinNative,
    renderableGasFeeMinNative,
    gasFeeMinConversion,
    renderableGasFeeMinConversion,
    gasFeeMaxNative,
    gasFeeMaxHex,
    renderableGasFeeMaxNative,
    gasFeeMaxConversion,
    renderableGasFeeMaxConversion,
    maxPriorityFeeNative,
    renderableMaxPriorityFeeNative,
    maxPriorityFeeConversion,
    renderableMaxPriorityFeeConversion,
    renderableMaxFeePerGasNative,
    renderableMaxFeePerGasConversion,
    timeEstimate,
    timeEstimateColor,
    timeEstimateId,
    totalMinNative,
    renderableTotalMinNative,
    totalMinConversion,
    renderableTotalMinConversion,
    totalMaxNative,
    renderableTotalMaxNative,
    totalMaxConversion,
    renderableTotalMaxConversion,
    estimatedBaseFee,
    estimatedBaseFeeHex,
    suggestedMaxPriorityFeePerGas,
    suggestedMaxPriorityFeePerGasHex,
    suggestedMaxFeePerGas,
    suggestedMaxFeePerGasHex,
    gasLimitHex,
    suggestedGasLimit: selectedGasFee.suggestedGasLimit,
    totalMinHex,
    totalMaxHex,
  };
};

export const parseTransactionLegacy = (
  {
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    transactionState: { selectedAsset, transaction: { value, data } } = {
      selectedAsset: '',
      transaction: {},
    },
    ticker,
    selectedGasFee,
    multiLayerL1FeeTotal,
  },
  { onlyGas } = {},
) => {
  const gasLimit = new BN(selectedGasFee.suggestedGasLimit);
  const gasLimitHex = BNToHex(new BN(selectedGasFee.suggestedGasLimit));

  let weiTransactionFee =
    gasLimit &&
    gasLimit.mul(hexToBN(decGWEIToHexWEI(selectedGasFee.suggestedGasPrice)));
  if (multiLayerL1FeeTotal) {
    weiTransactionFee = hexToBN(
      sumHexWEIs([BNToHex(weiTransactionFee), multiLayerL1FeeTotal]),
    );
  }

  const suggestedGasPriceHex = decGWEIToHexWEI(
    selectedGasFee.suggestedGasPrice,
  );

  const valueBN = value ? hexToBN(value) : hexToBN('0x0');
  const transactionFeeFiat = weiToFiat(
    weiTransactionFee,
    conversionRate,
    currentCurrency,
  );
  const parsedTicker = getTicker(ticker);
  const transactionFee = `${renderFromWei(weiTransactionFee)} ${parsedTicker}`;

  const totalHex = valueBN.add(weiTransactionFee);

  if (onlyGas) {
    return {
      transactionFeeFiat,
      transactionFee,
      suggestedGasPrice: selectedGasFee.suggestedGasPrice,
      suggestedGasPriceHex,
      suggestedGasLimit: selectedGasFee.suggestedGasLimit,
      suggestedGasLimitHex: gasLimitHex,
      totalHex,
    };
  }

  let transactionTotalAmount, transactionTotalAmountFiat;

  if (selectedAsset.isETH) {
    const transactionTotalAmountBN =
      weiTransactionFee && weiTransactionFee.add(valueBN);
    transactionTotalAmount = `${renderFromWei(
      transactionTotalAmountBN,
    )} ${parsedTicker}`;
    transactionTotalAmountFiat = weiToFiat(
      transactionTotalAmountBN,
      conversionRate,
      currentCurrency,
    );
  } else if (selectedAsset.tokenId) {
    const transactionTotalAmountBN =
      weiTransactionFee && weiTransactionFee.add(valueBN);
    transactionTotalAmount = `${renderFromWei(
      weiTransactionFee,
    )} ${parsedTicker}`;

    transactionTotalAmountFiat = weiToFiat(
      transactionTotalAmountBN,
      conversionRate,
      currentCurrency,
    );
  } else if (data) {
    const { address, symbol = 'ERC20', decimals } = selectedAsset;
    const [, , rawAmount] = decodeTransferData('transfer', data);
    const rawAmountString = parseInt(rawAmount, 16).toLocaleString('fullwide', {
      useGrouping: false,
    });
    const transferValue = renderFromTokenMinimalUnit(rawAmountString, decimals);
    const transactionValue = `${transferValue} ${symbol}`;
    const exchangeRate = contractExchangeRates?.[address]?.price;
    const transactionFeeFiatNumber = weiToFiatNumber(
      weiTransactionFee,
      conversionRate,
    );

    const transactionValueFiatNumber = balanceToFiatNumber(
      transferValue,
      conversionRate,
      exchangeRate,
    );
    transactionTotalAmount = `${transactionValue} + ${renderFromWei(
      weiTransactionFee,
    )} ${parsedTicker}`;
    transactionTotalAmountFiat = renderFiatAddition(
      transactionValueFiatNumber,
      transactionFeeFiatNumber,
      currentCurrency,
    );
  }

  return {
    transactionFeeFiat,
    transactionFee,
    transactionTotalAmount,
    transactionTotalAmountFiat,
    suggestedGasPrice: selectedGasFee.suggestedGasPrice,
    suggestedGasPriceHex,
    suggestedGasLimit: selectedGasFee.suggestedGasLimit,
    suggestedGasLimitHex: gasLimitHex,
    totalHex,
  };
};

/**
 * Validate transaction value for speed up or cancel transaction actions
 *
 * @param {object} transaction - Transaction object to validate
 * @param {string} rate - Rate to validate
 * @param {{ [address: string]: { balance: string } }} accounts - Map of accounts to information objects including balances
 * @returns {boolean} - Whether the balance is validated or not
 */
export function validateTransactionActionBalance(transaction, rate, accounts) {
  try {
    const checksummedFrom = safeToChecksumAddress(transaction.transaction.from);
    const balance = accounts[checksummedFrom].balance;

    let gasPrice = transaction.transaction.gasPrice;
    const transactionToCheck = transaction.transaction;

    if (isEIP1559Transaction(transactionToCheck)) {
      gasPrice = transactionToCheck.maxFeePerGas;
    }

    return hexToBN(balance).lt(
      hexToBN(gasPrice)
        .mul(new BN(rate * 10))
        .div(new BN(10))
        .mul(hexToBN(transaction.transaction.gas))
        .add(hexToBN(transaction.transaction.value)),
    );
  } catch (e) {
    return false;
  }
}

/**
 * @param {number|string|BigNumber} value
 * @param {number=} decimals
 * @returns {BigNumber}
 */
export function calcTokenAmount(value, decimals) {
  const divisor = new BigNumber(10).pow(decimals ?? 0);
  return new BigNumber(String(value)).div(divisor);
}

export function calcTokenValue(value, decimals) {
  const multiplier = Math.pow(10, Number(decimals || 0));
  return new BigNumber(String(value)).times(multiplier);
}

/**
 * Attempts to get the address parameter of the given token transaction data
 * (i.e. function call) per the Human Standard Token ABI, in the following
 * order:
 *   - The '_to' parameter, if present
 *   - The first parameter, if present
 *
 * @param {Object} tokenData - ethers Interface token data.
 * @returns {string | undefined} A lowercase address string.
 */
export function getTokenAddressParam(tokenData = {}) {
  const value = tokenData?.args?._to || tokenData?.args?.[0];
  return value?.toString().toLowerCase();
}

/**
 * Gets the '_hex' parameter of the given token transaction data
 * (i.e function call) per the Human Standard Token ABI, if present.
 *
 * @param {Object} tokenData - ethers Interface token data.
 * @returns {string | undefined} A hex string value.
 */
export function getTokenValueParamAsHex(tokenData = {}) {
  const value = tokenData?.args?._value?._hex || tokenData?.args?.[1]._hex;
  return value?.toLowerCase();
}

/**
 * Gets the '_value' parameter of the given token transaction data
 * (i.e function call) per the Human Standard Token ABI, if present.
 *
 * @param {Object} tokenData - ethers Interface token data.
 * @returns {string | undefined} A decimal string value.
 */
export function getTokenValueParam(tokenData = {}) {
  return tokenData?.args?._value?.toString();
}

export function getTokenValue(tokenParams = []) {
  const valueData = tokenParams.find((param) => param.name === '_value');
  return valueData && valueData.value;
}

/**
 * Generates a new transaction with the token allowance
 * @param {String | Object} tokenValue - value for the token allowance
 * @param {Number} tokenDecimals - Token decimal
 * @param {String} spenderAddress - Address to which the allowance will be granted
 * @param {Object} transaction - Transaction to update
 * @returns A new transaction object with the token allowance encoded
 */
export const generateTxWithNewTokenAllowance = (
  tokenValue,
  tokenDecimals,
  spenderAddress,
  transaction,
) => {
  const uint = toTokenMinimalUnit(tokenValue, tokenDecimals);
  const approvalData = generateApprovalData({
    spender: spenderAddress,
    value: uint.gt(UINT256_BN_MAX_VALUE)
      ? UINT256_BN_MAX_VALUE.toString(16)
      : uint.toString(16),
    data: transaction?.data,
  });
  const newApprovalTransaction = {
    ...transaction,
    data: approvalData,
  };
  return newApprovalTransaction;
};

/**
 * Returns the minimum valid token allowance
 * @param {Number} tokenDecimals - Token decimal
 * @returns String indicating the minimum token allowance
 */
export const minimumTokenAllowance = (tokenDecimals) => {
  if (tokenDecimals < 0) {
    throw new Error(NEGATIVE_TOKEN_DECIMALS);
  }
  return Math.pow(10, -1 * tokenDecimals)
    .toFixed(tokenDecimals)
    .toString(10);
};

/**
 * For a MM Swap tx: Determines if the transaction is an ERC20 approve tx OR the actual swap tx where tokens are transferred
 */
export const getIsSwapApproveOrSwapTransaction = (
  data,
  origin,
  to,
  chainId,
) => {
  if (!data) {
    return false;
  }

  // Exclude token transfers (e.g., WETH sends) - these are not swap transactions
  const fourByteSignature = getFourByteSignature(data);
  if (fourByteSignature === TRANSFER_FUNCTION_SIGNATURE) {
    return false;
  }

  const isLegacySwap = origin === process.env.MM_FOX_CODE;
  const isUnifiedSwap = origin === ORIGIN_METAMASK;

  // if approval data includes metaswap contract
  // if destination address is metaswap contract
  return (
    (isLegacySwap || isUnifiedSwap) &&
    to &&
    (swapsUtils.isValidContractAddress(chainId, to) ||
      (data?.startsWith(APPROVE_FUNCTION_SIGNATURE) &&
        decodeApproveData(data).spenderAddress?.toLowerCase() ===
          swapsUtils.getSwapsContractAddress(chainId)))
  );
};

/**
 * For a MM Swap tx: Determines if the transaction is an ERC20 approve tx
 */
export const getIsSwapApproveTransaction = (data, origin, to, chainId) => {
  if (!data) {
    return false;
  }

  const isFromSwaps = origin === process.env.MM_FOX_CODE;
  const isApproveFunction =
    data && getFourByteSignature(data) === APPROVE_FUNCTION_SIGNATURE;
  const isSpenderSwapsContract =
    decodeApproveData(data).spenderAddress?.toLowerCase() ===
    swapsUtils.getSwapsContractAddress(chainId);

  return isFromSwaps && to && isApproveFunction && isSpenderSwapsContract;
};

/**
 * For a MM Swap tx: Determines if the transaction is the actual swap tx where tokens are transferred
 */
export const getIsSwapTransaction = (data, origin, to, chainId) => {
  const isSwapApproveOrSwapTransaction = getIsSwapApproveOrSwapTransaction(
    data,
    origin,
    to,
    chainId,
  );
  const isSwapApprove = getIsSwapApproveTransaction(data, origin, to, chainId);

  return isSwapApproveOrSwapTransaction && !isSwapApprove;
};

/**
 * For a MM Swap tx: Determines if the transaction is a native swap
 */
export const getIsNativeTokenTransferred = (txParams) =>
  txParams?.value !== '0x0';

/**
 * Checks if the given token standard is non-fungible (ERC721 or ERC1155).
 *
 * @param {string} tokenStandard - The token standard to check.
 * @returns {boolean} - True if the token standard is ERC721 or ERC1155, otherwise false.
 */
export function isNFTTokenStandard(tokenStandard) {
  return [ERC721, ERC1155].includes(tokenStandard);
}

/**
 * Get a transaction by its ID
 * @param {string} transactionId - The ID of the transaction to get
 * @param {TransactionController} transactionController - The transaction controller
 * @returns {TransactionMeta} The transaction meta object
 */
export function getTransactionById(transactionId, transactionController) {
  return transactionController.state.transactions.find(
    (tx) => tx.id === transactionId,
  );
}
