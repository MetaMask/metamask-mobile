import { isBN, hexToBN } from '../number';
import { safeToChecksumAddress } from '../address';
import Engine from '../../core/Engine';
import TransactionTypes from '../../core/TransactionTypes';
import { toLowerCaseEquals } from '../general';
import { strings } from '../../../locales/i18n';
import { BN } from 'ethereumjs-util';
import { lt } from '../lodash';

interface opts {
  amount?: string;
  data?: any;
  to?: string;
}

interface SelectedAsset {
  address: string;
  decimals: string;
  symbol: string;
}

interface Transaction {
  assetType: string;
  data: string;
  ensRecipient: string | undefined;
  from: string;
  gas: BN;
  gasPrice: BN;
  id: string;
  nonce: string | undefined;
  origin: string;
  paymentRequest: boolean | undefined;
  proposedNonce: number | undefined;
  readableValue: string;
  selectedAsset: SelectedAsset;
  symbol: string;
  to: string;
  transaction: {
    data: string;
    from: string;
    gas: string;
    to: string;
    value: string;
  };
  transactionFromName: string | undefined;
  transactionTo: string | undefined;
  transactionToName: string | undefined;
  transactionValue: string | undefined;
  type: string;
  value: string;
  warningGasPriceHigh: string | undefined;
}

interface EstimatedGas {
  gas: string;
  gasPrice: string | undefined;
}

/**
 * Estimates gas limit
 *
 * @param {object} opts - Object containing optional attributes object to calculate gas with (amount, data and to)
 * @returns {object} - Object containing gas estimation
 */
export const estimateGas = async (
  opts: opts,
  transaction: Transaction,
): Promise<EstimatedGas> => {
  const { TransactionController }: any = Engine.context;
  const { from, selectedAsset } = transaction;
  const {
    amount = transaction.value,
    data = transaction.data,
    to = transaction.to,
  } = opts;
  let estimation;
  try {
    estimation = await TransactionController.estimateGas({
      amount,
      from,
      data,
      to: selectedAsset?.address ? selectedAsset.address : to,
    });
  } catch (e) {
    estimation = { gas: TransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT };
  }
  return estimation;
};

/**
 * Validates Ether transaction amount
 *
 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
 */
export const validateEtherAmount = (
  value: BN,
  from: string,
  allowEmpty = true,
): string | undefined => {
  if (!allowEmpty) {
    if (!value || !from) {
      return strings('transaction.invalid_amount');
    }
    if (value && !isBN(value)) {
      return strings('transaction.invalid_amount');
    }
  }
};

interface ContractBalances {
  [key: string]: string;
}

/**
 * Validates asset (ERC20) transaction amount
 *
 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
 */
export const validateTokenAmount = async (
  value: BN,
  gas: BN,
  from: string,
  selectedAsset: SelectedAsset,
  contractBalances: ContractBalances,
  allowEmpty = true,
): Promise<string | undefined> => {
  if (!allowEmpty) {
    const checksummedFrom = safeToChecksumAddress(from) || '';

    if (!value) {
      return strings('transaction.invalid_amount');
    }

    if (!gas) {
      return strings('transaction.invalid_gas');
    }

    if (!from) {
      return strings('transaction.invalid_from_address');
    }
    // If user trying to send a token that doesn't own, validate balance querying contract
    // If it fails, skip validation
    let contractBalanceForAddress;
    if (contractBalances[selectedAsset.address]) {
      contractBalanceForAddress = hexToBN(
        contractBalances[selectedAsset.address].toString(),
      );
    } else {
      const { AssetsContractController }: any = Engine.context;
      try {
        contractBalanceForAddress =
          await AssetsContractController.getERC20BalanceOf(
            selectedAsset.address,
            checksummedFrom,
          );
      } catch (e) {
        // Don't validate balance if error
      }
    }
    if (value && !isBN(value)) return strings('transaction.invalid_amount');
    const validateAssetAmount =
      contractBalanceForAddress &&
      lt(contractBalanceForAddress, value as unknown as number);
    if (validateAssetAmount) return strings('transaction.insufficient');
  }
};

export const validateCollectibleOwnership = async (
  address: string,
  tokenId: string,
  selectedAddress: string,
): Promise<string | undefined> => {
  const { AssetsContractController }: any = Engine.context;

  try {
    const owner = await AssetsContractController.getERC721OwnerOf(
      address,
      tokenId,
    );
    const isOwner = toLowerCaseEquals(owner, selectedAddress);

    return !isOwner
      ? strings('transaction.invalid_collectible_ownership')
      : undefined;
  } catch (e) {
    return strings('transaction.invalid_collectible_ownership');
  }
};

interface Validations {
  ETH: () => string | undefined;
  ERC20: () => Promise<string | undefined>;
  ERC721: () => Promise<string | undefined | boolean>;
}

type AssetType = keyof Validations;

export const validateAmount = async (
  assetType: AssetType,
  address: string,
  tokenId: string,
  selectedAddress: string,
  transaction: Transaction,
  contractBalances: ContractBalances,
  allowEmpty = true,
) => {
  const { value, from, gas, selectedAsset } = transaction;

  const validations: Validations = {
    ETH: () => validateEtherAmount(value as unknown as BN, from, allowEmpty),
    ERC20: async () =>
      await validateTokenAmount(
        value as unknown as BN,
        gas,
        from,
        selectedAsset,
        contractBalances,
        allowEmpty,
      ),
    ERC721: async () =>
      await validateCollectibleOwnership(address, tokenId, selectedAddress),
  };

  return !validations[assetType] ? false : await validations[assetType]();
};

interface GasAnalyticsParams {
  dapp_host_name: string;
  dapp_url: string;
  active_currency: { value: string; anonymous: boolean };
  gas_estimate_type: string;
}

export const getGasAnalyticsParams = (
  transaction: Transaction,
  activeTabUrl: string,
  gasEstimateType: string,
): GasAnalyticsParams | Record<string, never> => {
  try {
    const { selectedAsset, origin } = transaction;
    return {
      dapp_host_name: origin,
      dapp_url: activeTabUrl,
      active_currency: { value: selectedAsset?.symbol, anonymous: true },
      gas_estimate_type: gasEstimateType,
    };
  } catch (error) {
    return {};
  }
};

interface setTransactionObjectReturn {
  type: string;
  transaction: Transaction;
}

type setTransactionObjectType = (
  transaction: Partial<Transaction>,
) => setTransactionObjectReturn;

/**
 * Updates gas and gasPrice in transaction state
 *
 * @param {object} gasLimit - BN object containing gasLimit value
 * @param {object} gasPrice - BN object containing gasPrice value
 * @param {function} setTransactionObject - Sets any attribute in transaction object
 */
export const handleGasFeeSelection = (
  gasLimit: BN,
  gasPrice: BN,
  setTransactionObject: setTransactionObjectType,
): void => {
  const transactionObject = {
    gas: gasLimit,
    gasPrice,
  };
  setTransactionObject(transactionObject);
};

/**
 * Updates gas limit of the current transaction object
 *
 */
export const handleGetGasLimit = async (
  transaction: Transaction,
  setTransactionObject: setTransactionObjectType,
): Promise<void> => {
  if (!Object.keys(transaction.selectedAsset).length) return;
  const { gas } = await estimateGas({}, transaction);
  setTransactionObject({ gas: hexToBN(gas) as BN });
};
